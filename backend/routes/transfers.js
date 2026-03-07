import express from 'express'
import { existsSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { isPendingGrant } from '@interledger/open-payments'
import { DEFAULT_KEY_ID, DEFAULT_PRIVATE_KEY_PATH, PUBLIC_BASE_URL } from '../src/config.js'
import { transfers } from '../src/store.js'
import { createClient, cleanupTempKeyFile } from '../src/payments.js'
import { runStep, normalizeError, requireGrantAccessToken } from '../src/helpers.js'

const router = express.Router()

router.post('/api/transfer/init', async (req, res) => {
  let tempPrivateKeyPathForCleanup = ''

  try {
    const {
      senderWalletAddress,
      recipientWalletAddress,
      amount,
      assetCode,
      assetScale,
      keyId,
      privateKeyPath
    } = req.body || {}

    if (!senderWalletAddress || !recipientWalletAddress) {
      return res.status(400).json({ error: 'senderWalletAddress and recipientWalletAddress are required' })
    }

    const amountValue = String(amount || '').trim()
    const scale = Number(assetScale)
    const normalizedAssetCode = String(assetCode || '').trim().toUpperCase()

    if (!/^\d+$/.test(amountValue) || Number(amountValue) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive integer string' })
    }
    if (!Number.isInteger(scale) || scale < 0 || scale > 18) {
      return res.status(400).json({ error: 'assetScale must be an integer from 0 to 18' })
    }
    if (!normalizedAssetCode || !/^[A-Za-z0-9]{2,10}$/.test(normalizedAssetCode)) {
      return res.status(400).json({ error: 'assetCode must be 2-10 alphanumeric chars' })
    }

    const transferId = randomUUID()
    const clientNonce = randomUUID()
    const callbackUrl = `${PUBLIC_BASE_URL}/api/transfer/callback?transferId=${encodeURIComponent(transferId)}`
    const effectiveKeyId = String(keyId || DEFAULT_KEY_ID || '').trim()
    const effectivePrivateKeyInput = String(privateKeyPath || DEFAULT_PRIVATE_KEY_PATH || '').trim()

    const { client, resolvedPrivateKeyPath, isTempKey } = await runStep('Create authenticated client', () =>
      createClient({ senderWalletAddress, keyId: effectiveKeyId, privateKeyPath: effectivePrivateKeyInput })
    )

    if (isTempKey) tempPrivateKeyPathForCleanup = resolvedPrivateKeyPath

    const senderWallet = await runStep('Get sender wallet address', () =>
      client.walletAddress.get({ url: senderWalletAddress })
    )

    const senderWalletKeys = await runStep('Get sender wallet key registry', () =>
      client.walletAddress.getKeys({ url: senderWalletAddress })
    )

    const knownKeyIds = Array.isArray(senderWalletKeys?.keys)
      ? senderWalletKeys.keys.map((k) => k.kid)
      : []
    if (knownKeyIds.length > 0 && !knownKeyIds.includes(effectiveKeyId)) {
      return res.status(400).json({
        error: `keyId '${effectiveKeyId}' was not found in sender wallet key registry. Known key IDs: ${knownKeyIds.join(', ')}`
      })
    }

    const debitAssetCode = String(senderWallet.assetCode || normalizedAssetCode || '').toUpperCase()
    const debitAssetScale = Number.isInteger(senderWallet.assetScale)
      ? Number(senderWallet.assetScale)
      : scale

    if (!debitAssetCode || !/^[A-Za-z0-9]{2,10}$/.test(debitAssetCode)) {
      return res.status(400).json({ error: 'Could not determine sender wallet assetCode. Check sender wallet address and try again.' })
    }
    if (!Number.isInteger(debitAssetScale) || debitAssetScale < 0 || debitAssetScale > 18) {
      return res.status(400).json({ error: 'Could not determine sender wallet assetScale. Check sender wallet address and try again.' })
    }

    const recipientWallet = await runStep('Get recipient wallet address', () =>
      client.walletAddress.get({ url: recipientWalletAddress })
    )

    const incomingGrant = await runStep('Request incoming-payment grant', () =>
      client.grant.request(
        { url: recipientWallet.authServer },
        { access_token: { access: [{ type: 'incoming-payment', actions: ['create'] }] } }
      )
    )
    const incomingAccessToken = requireGrantAccessToken(incomingGrant, 'recipient incoming-payment grant')

    const incomingPayment = await runStep('Create incoming payment', () =>
      client.incomingPayment.create(
        { url: recipientWallet.resourceServer, accessToken: incomingAccessToken },
        { walletAddress: recipientWallet.id }
      )
    )

    const quoteGrant = await runStep('Request quote grant', () =>
      client.grant.request(
        { url: senderWallet.authServer },
        { access_token: { access: [{ type: 'quote', actions: ['create'] }] } }
      )
    )
    const quoteAccessToken = requireGrantAccessToken(quoteGrant, 'sender quote grant')

    const quote = await runStep('Create quote', () =>
      client.quote.create(
        { url: senderWallet.resourceServer, accessToken: quoteAccessToken },
        {
          method: 'ilp',
          walletAddress: senderWallet.id,
          receiver: incomingPayment.id,
          debitAmount: { value: amountValue, assetCode: debitAssetCode, assetScale: debitAssetScale }
        }
      )
    )

    const pendingGrant = await runStep('Request interactive outgoing-payment grant', () =>
      client.grant.request(
        { url: senderWallet.authServer },
        {
          access_token: {
            access: [
              {
                identifier: senderWallet.id,
                type: 'outgoing-payment',
                actions: ['create', 'read'],
                limits: { debitAmount: quote.debitAmount }
              }
            ]
          },
          interact: {
            start: ['redirect'],
            finish: { method: 'redirect', uri: callbackUrl, nonce: clientNonce }
          }
        }
      )
    )

    if (!isPendingGrant(pendingGrant)) {
      throw new Error('Expected interactive pending outgoing-payment grant')
    }

    transfers.set(transferId, {
      transferId,
      status: 'pending-consent',
      createdAt: new Date().toISOString(),
      senderWalletAddress: senderWallet.id,
      senderResourceServer: senderWallet.resourceServer,
      senderAuthServer: senderWallet.authServer,
      recipientWalletAddress: recipientWallet.id,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      quoteExpiresAt: quote.expiresAt,
      continueUri: pendingGrant.continue.uri,
      continueAccessToken: pendingGrant.continue.access_token.value,
      interactNonce: pendingGrant.interact.finish,
      clientNonce,
      grantRequestUrl: senderWallet.authServer,
      keyId: effectiveKeyId,
      privateKeyPath: resolvedPrivateKeyPath,
      privateKeyIsTemp: isTempKey
    })

    tempPrivateKeyPathForCleanup = ''

    return res.json({
      transferId,
      redirectUrl: pendingGrant.interact.redirect,
      quoteId: quote.id,
      quoteExpiresAt: quote.expiresAt,
      incomingPaymentId: incomingPayment.id
    })
  } catch (error) {
    if (tempPrivateKeyPathForCleanup && existsSync(tempPrivateKeyPathForCleanup)) {
      try { unlinkSync(tempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
    }
    const normalized = normalizeError(error)
    console.error('[transfer-init]', normalized)
    return res.status(500).json({ error: normalized })
  }
})

router.get('/api/transfers/:id', (req, res) => {
  const transfer = transfers.get(req.params.id)
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' })
  return res.json(transfer)
})

export default router
