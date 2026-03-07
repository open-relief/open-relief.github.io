import express from 'express'
import { existsSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { isPendingGrant } from '@interledger/open-payments'
import { DEFAULT_KEY_ID, DEFAULT_PRIVATE_KEY_PATH, PUBLIC_BASE_URL } from '../src/config.js'
import { transfers, fundRequests } from '../src/store.js'
import {
  createClient,
  getDonationRecipientConfig,
  donationRecipientIsConfigured,
  cleanupTempKeyFile
} from '../src/payments.js'
import { runStep, normalizeError, requireGrantAccessToken } from '../src/helpers.js'

const router = express.Router()

router.post('/api/donations/init', async (req, res) => {
  let donorTempPrivateKeyPathForCleanup = ''
  let recipientTempPrivateKeyPathForCleanup = ''

  try {
    const donationRecipient = getDonationRecipientConfig()
    if (!donationRecipientIsConfigured()) {
      return res.status(500).json({
        error: 'Donation recipient is not configured. Set DONATION_RECIPIENT_KEY_ID, DONATION_RECIPIENT_PRIVATE_KEY_PATH, and DONATION_RECIPIENT_WALLET_ADDRESS.'
      })
    }

    const { donorWalletAddress, amount, keyId, privateKeyPath, requestId } = req.body || {}

    if (!donorWalletAddress) return res.status(400).json({ error: 'donorWalletAddress is required' })

    const amountValue = String(amount || '').trim()
    if (!/^\d+$/.test(amountValue) || Number(amountValue) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive integer string' })
    }

    const associatedRequest = requestId ? fundRequests.get(String(requestId).trim()) : null
    if (requestId && !associatedRequest) {
      return res.status(404).json({ error: `Fund request not found: ${requestId}` })
    }
    if (associatedRequest && ['rejected', 'funded'].includes(associatedRequest.status)) {
      return res.status(400).json({
        error: `Fund request ${associatedRequest.requestId} is ${associatedRequest.status} and cannot be donated to.`
      })
    }

    const effectiveDonorKeyId = String(keyId || DEFAULT_KEY_ID || '').trim()
    const effectiveDonorPrivateKeyInput = String(privateKeyPath || DEFAULT_PRIVATE_KEY_PATH || '').trim()

    const transferId = randomUUID()
    const clientNonce = randomUUID()
    const callbackUrl = `${PUBLIC_BASE_URL}/api/donations/callback?transferId=${encodeURIComponent(transferId)}`

    const donorBundle = await runStep('Create donor authenticated client', () =>
      createClient({ senderWalletAddress: donorWalletAddress, keyId: effectiveDonorKeyId, privateKeyPath: effectiveDonorPrivateKeyInput })
    )
    const recipientBundle = await runStep('Create recipient authenticated client', () =>
      createClient({ senderWalletAddress: donationRecipient.walletAddress, keyId: donationRecipient.keyId, privateKeyPath: donationRecipient.privateKeyInput })
    )

    if (donorBundle.isTempKey) donorTempPrivateKeyPathForCleanup = donorBundle.resolvedPrivateKeyPath
    if (recipientBundle.isTempKey) recipientTempPrivateKeyPathForCleanup = recipientBundle.resolvedPrivateKeyPath

    const donorClient = donorBundle.client
    const recipientClient = recipientBundle.client

    const donorWallet = await runStep('Get donor wallet address', () =>
      donorClient.walletAddress.get({ url: donorWalletAddress })
    )

    const donorWalletKeys = await runStep('Get donor wallet key registry', () =>
      donorClient.walletAddress.getKeys({ url: donorWalletAddress })
    )

    const donorKeyIds = Array.isArray(donorWalletKeys?.keys)
      ? donorWalletKeys.keys.map((k) => k.kid)
      : []
    if (donorKeyIds.length > 0 && !donorKeyIds.includes(effectiveDonorKeyId)) {
      return res.status(400).json({
        error: `Donor keyId '${effectiveDonorKeyId}' not found in donor wallet key registry. Known key IDs: ${donorKeyIds.join(', ')}`
      })
    }

    const recipientWallet = await runStep('Get recipient wallet address', () =>
      recipientClient.walletAddress.get({ url: donationRecipient.walletAddress })
    )

    const incomingGrant = await runStep('Request recipient incoming-payment grant', () =>
      recipientClient.grant.request(
        { url: recipientWallet.authServer },
        { access_token: { access: [{ type: 'incoming-payment', actions: ['create'] }] } }
      )
    )
    const incomingAccessToken = requireGrantAccessToken(incomingGrant, 'recipient incoming-payment grant')

    const incomingPayment = await runStep('Create recipient incoming payment', () =>
      recipientClient.incomingPayment.create(
        { url: recipientWallet.resourceServer, accessToken: incomingAccessToken },
        { walletAddress: recipientWallet.id }
      )
    )

    const quoteGrant = await runStep('Request donor quote grant', () =>
      donorClient.grant.request(
        { url: donorWallet.authServer },
        { access_token: { access: [{ type: 'quote', actions: ['create'] }] } }
      )
    )
    const quoteAccessToken = requireGrantAccessToken(quoteGrant, 'donor quote grant')

    const debitAssetCode = String(donorWallet.assetCode || '').toUpperCase()
    const debitAssetScale = Number(donorWallet.assetScale)
    if (!debitAssetCode || !Number.isInteger(debitAssetScale)) {
      return res.status(400).json({ error: 'Could not determine donor wallet asset metadata for quote creation.' })
    }

    const quote = await runStep('Create donor quote', () =>
      donorClient.quote.create(
        { url: donorWallet.resourceServer, accessToken: quoteAccessToken },
        {
          method: 'ilp',
          walletAddress: donorWallet.id,
          receiver: incomingPayment.id,
          debitAmount: { value: amountValue, assetCode: debitAssetCode, assetScale: debitAssetScale }
        }
      )
    )

    const pendingGrant = await runStep('Request donor outgoing interactive grant', () =>
      donorClient.grant.request(
        { url: donorWallet.authServer },
        {
          access_token: {
            access: [
              {
                identifier: donorWallet.id,
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
      type: 'donation',
      status: 'pending-consent',
      createdAt: new Date().toISOString(),
      senderWalletAddress: donorWallet.id,
      senderResourceServer: donorWallet.resourceServer,
      senderAuthServer: donorWallet.authServer,
      recipientWalletAddress: recipientWallet.id,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      quoteExpiresAt: quote.expiresAt,
      continueUri: pendingGrant.continue.uri,
      continueAccessToken: pendingGrant.continue.access_token.value,
      interactNonce: pendingGrant.interact.finish,
      clientNonce,
      grantRequestUrl: donorWallet.authServer,
      keyId: effectiveDonorKeyId,
      privateKeyPath: donorBundle.resolvedPrivateKeyPath,
      privateKeyIsTemp: donorBundle.isTempKey,
      requestId: associatedRequest?.requestId || null
    })

    donorTempPrivateKeyPathForCleanup = ''

    if (recipientTempPrivateKeyPathForCleanup && existsSync(recipientTempPrivateKeyPathForCleanup)) {
      try { unlinkSync(recipientTempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
      recipientTempPrivateKeyPathForCleanup = ''
    }

    return res.json({
      transferId,
      redirectUrl: pendingGrant.interact.redirect,
      quoteId: quote.id,
      quoteExpiresAt: quote.expiresAt,
      incomingPaymentId: incomingPayment.id,
      requestId: associatedRequest?.requestId || null
    })
  } catch (error) {
    if (donorTempPrivateKeyPathForCleanup && existsSync(donorTempPrivateKeyPathForCleanup)) {
      try { unlinkSync(donorTempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
    }
    if (recipientTempPrivateKeyPathForCleanup && existsSync(recipientTempPrivateKeyPathForCleanup)) {
      try { unlinkSync(recipientTempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
    }
    const normalized = normalizeError(error)
    console.error('[donations-init]', normalized)
    return res.status(500).json({ error: normalized })
  }
})

export default router
