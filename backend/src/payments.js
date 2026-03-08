import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createAuthenticatedClient, isPendingGrant } from '@interledger/open-payments'
import {
  PUBLIC_BASE_URL,
  DONATION_RECIPIENT_KEY_ID,
  DONATION_RECIPIENT_PRIVATE_KEY_PATH,
  DONATION_RECIPIENT_WALLET_ADDRESS,
  TEMP_KEY_DIR
} from './config.js'
import { transfers, getCachedOutgoingToken, clearCachedOutgoingToken } from './store.js'
import {
  convertPrivateKeyToPemIfNeeded,
  requireGrantAccessToken,
  runStep,
  normalizeError,
  wrapStepError,
  amountValueToBigInt,
  formatAmountForHumans,
  sleep
} from './helpers.js'

mkdirSync(TEMP_KEY_DIR, { recursive: true })

export function getDonationRecipientConfig() {
  return {
    keyId: DONATION_RECIPIENT_KEY_ID,
    privateKeyInput: DONATION_RECIPIENT_PRIVATE_KEY_PATH,
    walletAddress: DONATION_RECIPIENT_WALLET_ADDRESS
  }
}

export function donationRecipientIsConfigured() {
  const config = getDonationRecipientConfig()
  return Boolean(config.keyId && config.privateKeyInput && config.walletAddress)
}

export async function createClient({ senderWalletAddress, keyId, privateKeyPath }) {
  if (!keyId) {
    throw new Error('Missing keyId. Provide it in the form or set KEY_ID in .env.')
  }
  if (!privateKeyPath) {
    throw new Error(
      'Missing privateKeyPath. Provide it in the form or set PRIVATE_KEY_PATH in .env.'
    )
  }

  const normalizedInput = String(privateKeyPath).trim()
  let resolvedPrivateKeyPath = normalizedInput
  let isTempKey = false

  if (existsSync(normalizedInput)) {
    const existingContent = readFileSync(normalizedInput, 'utf8')
    const convertedPem = convertPrivateKeyToPemIfNeeded(existingContent)
    if (convertedPem && !/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(existingContent)) {
      resolvedPrivateKeyPath = join(TEMP_KEY_DIR, `private-${randomUUID()}.key`)
      writeFileSync(resolvedPrivateKeyPath, convertedPem, 'utf8')
      isTempKey = true
    }
  } else {
    const convertedPem = convertPrivateKeyToPemIfNeeded(normalizedInput)
    if (!convertedPem) {
      throw new Error(
        `privateKeyPath does not exist: ${normalizedInput}. If you pasted key text, use a PEM key, a raw base64 PKCS8 key, or PRIV-prefixed key value.`
      )
    }
    resolvedPrivateKeyPath = join(TEMP_KEY_DIR, `private-${randomUUID()}.key`)
    writeFileSync(resolvedPrivateKeyPath, convertedPem, 'utf8')
    isTempKey = true
  }

  const client = await createAuthenticatedClient({
    walletAddressUrl: senderWalletAddress,
    privateKey: resolvedPrivateKeyPath,
    keyId
  })

  return { client, resolvedPrivateKeyPath, isTempKey }
}

export function cleanupTempKeyFile(transfer) {
  if (!transfer?.privateKeyIsTemp || !transfer.privateKeyPath) return
  if (!existsSync(transfer.privateKeyPath)) return
  try {
    unlinkSync(transfer.privateKeyPath)
  } catch {
    // Best-effort cleanup only.
  }
}

export async function pollOutgoingPayment({ client, outgoingPaymentId, accessToken }) {
  let latest = null
  const maxAttempts = 6
  const delayMs = 1500

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      latest = await client.outgoingPayment.get({ url: outgoingPaymentId, accessToken })
    } catch (error) {
      const normalized = normalizeError(error)
      if (/status=403|code=403|\b403\b/.test(normalized)) {
        return {
          id: outgoingPaymentId,
          failed: false,
          sentAmount: { value: '0', assetCode: '', assetScale: 0 },
          debitAmount: { value: '0', assetCode: '', assetScale: 0 },
          _pollForbidden: true,
          _pollError: normalized
        }
      }
      throw wrapStepError('Get outgoing payment status', error)
    }

    const sent = amountValueToBigInt(latest.sentAmount)
    if (latest.failed || sent > 0n) return latest
    if (i < maxAttempts - 1) await sleep(delayMs)
  }

  return latest
}

export async function executeShawnPayoutForRequest(requestRecord) {
  if (!requestRecord) throw new Error('Missing request record for payout')

  if (!donationRecipientIsConfigured()) {
    throw new Error(
      'Donation recipient is not configured. Set DONATION_RECIPIENT_KEY_ID, DONATION_RECIPIENT_PRIVATE_KEY_PATH, and DONATION_RECIPIENT_WALLET_ADDRESS.'
    )
  }

  const recipientWalletAddress = String(requestRecord.requesterWalletAddress || '').trim()
  if (!/^https?:\/\//i.test(recipientWalletAddress)) {
    throw new Error('Request is missing a valid requester wallet address')
  }

  const amountValue = String(requestRecord.amount || '').trim()
  if (!/^\d+$/.test(amountValue) || Number(amountValue) <= 0) {
    throw new Error('Request amount must be a positive integer string')
  }

  const donationRecipient = getDonationRecipientConfig()
  let tempPrivateKeyPathForCleanup = ''
  const transferId = randomUUID()
  const clientNonce = randomUUID()
  const callbackUrl =
    `${PUBLIC_BASE_URL}/api/admin/payout/callback?transferId=${encodeURIComponent(transferId)}`

  try {
    const senderBundle = await runStep('Create Shawn payout client', () =>
      createClient({
        senderWalletAddress: donationRecipient.walletAddress,
        keyId: donationRecipient.keyId,
        privateKeyPath: donationRecipient.privateKeyInput
      })
    )

    if (senderBundle.isTempKey) tempPrivateKeyPathForCleanup = senderBundle.resolvedPrivateKeyPath

    const client = senderBundle.client

    const senderWallet = await runStep('Get Shawn wallet address', () =>
      client.walletAddress.get({ url: donationRecipient.walletAddress })
    )

    const senderWalletKeys = await runStep('Get Shawn wallet key registry', () =>
      client.walletAddress.getKeys({ url: donationRecipient.walletAddress })
    )

    const knownKeyIds = Array.isArray(senderWalletKeys?.keys)
      ? senderWalletKeys.keys.map((key) => key.kid)
      : []

    if (knownKeyIds.length > 0 && !knownKeyIds.includes(donationRecipient.keyId)) {
      throw new Error(
        `Shawn keyId '${donationRecipient.keyId}' was not found in wallet key registry. Known key IDs: ${knownKeyIds.join(', ')}`
      )
    }

    const recipientWallet = await runStep('Get requester wallet address', () =>
      client.walletAddress.get({ url: recipientWalletAddress })
    )

    const incomingGrant = await runStep('Request requester incoming-payment grant', () =>
      client.grant.request(
        { url: recipientWallet.authServer },
        { access_token: { access: [{ type: 'incoming-payment', actions: ['create'] }] } }
      )
    )

    const incomingAccessToken = requireGrantAccessToken(
      incomingGrant,
      'requester incoming-payment grant'
    )

    const incomingPayment = await runStep('Create requester incoming payment', () =>
      client.incomingPayment.create(
        { url: recipientWallet.resourceServer, accessToken: incomingAccessToken },
        {
          walletAddress: recipientWallet.id,
          incomingAmount: {
            value: amountValue,
            assetCode: String(recipientWallet.assetCode || 'SGD').toUpperCase(),
            assetScale: Number.isInteger(Number(recipientWallet.assetScale))
              ? Number(recipientWallet.assetScale)
              : 2
          }
        }
      )
    )

    const quoteGrant = await runStep('Request Shawn quote grant', () =>
      client.grant.request(
        { url: senderWallet.authServer },
        { access_token: { access: [{ type: 'quote', actions: ['create'] }] } }
      )
    )

    const quoteAccessToken = requireGrantAccessToken(quoteGrant, 'Shawn quote grant')

    const debitAssetCode = String(senderWallet.assetCode || '').toUpperCase()
    const debitAssetScale = Number(senderWallet.assetScale)
    if (!debitAssetCode || !Number.isInteger(debitAssetScale)) {
      throw new Error('Could not determine Shawn wallet asset metadata for quote creation.')
    }

    const quote = await runStep('Create Shawn payout quote', () =>
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

    // --- Option 3: reuse cached token to skip re-consent ---
    const cachedToken = getCachedOutgoingToken(senderWallet.id)

    if (cachedToken) {
      console.log('[payout] Using cached outgoing token — skipping interactive grant.')
      let outgoingPayment
      try {
        outgoingPayment = await runStep('Create Shawn outgoing payment (cached token)', () =>
          client.outgoingPayment.create(
            { url: cachedToken.resourceServer, accessToken: cachedToken.value },
            { walletAddress: senderWallet.id, quoteId: quote.id }
          )
        )
      } catch (tokenErr) {
        // Cached token was likely expired or revoked — clear it and fall through to interactive grant
        clearCachedOutgoingToken()
        console.warn('[payout] Cached token failed, falling back to interactive grant:', tokenErr?.message)
        // Re-throw so the outer catch re-surfaces, admin re-approves once
        throw wrapStepError('Create Shawn outgoing payment (cached token)', tokenErr)
      }

      const outgoingStatus = await pollOutgoingPayment({
        client,
        outgoingPaymentId: outgoingPayment.id,
        accessToken: cachedToken.value
      })

      const settledStatus = outgoingStatus || {
        id: outgoingPayment.id,
        failed: false,
        sentAmount: { value: '0', assetCode: debitAssetCode, assetScale: debitAssetScale },
        debitAmount: quote.debitAmount
      }

      const sentValue = amountValueToBigInt(settledStatus.sentAmount)
      const transferRecord = {
        transferId,
        type: 'admin-payout',
        requestId: requestRecord.requestId,
        status: settledStatus.failed ? 'failed' : sentValue === 0n ? 'pending-settlement' : 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        senderWalletAddress: senderWallet.id,
        senderResourceServer: senderWallet.resourceServer,
        senderAuthServer: senderWallet.authServer,
        recipientWalletAddress: recipientWallet.id,
        incomingPaymentId: incomingPayment.id,
        quoteId: quote.id,
        quoteExpiresAt: quote.expiresAt,
        outgoingPaymentId: outgoingPayment.id,
        outgoingSentAmount: settledStatus.sentAmount,
        outgoingDebitAmount: settledStatus.debitAmount
      }

      if (settledStatus.failed) {
        transferRecord.error = `Outgoing payment failed. sent=${formatAmountForHumans(settledStatus.sentAmount)} debit=${formatAmountForHumans(settledStatus.debitAmount)}`
        transfers.set(transferId, transferRecord)
        throw new Error(transferRecord.error)
      }

      transfers.set(transferId, transferRecord)

      if (tempPrivateKeyPathForCleanup && existsSync(tempPrivateKeyPathForCleanup)) {
        try { unlinkSync(tempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup. */ }
        tempPrivateKeyPathForCleanup = ''
      }

      return {
        transferId,
        status: transferRecord.status,
        requiresConsent: false,
        redirectUrl: '',
        outgoingPaymentId: outgoingPayment.id,
        outgoingSentAmount: settledStatus.sentAmount,
        outgoingDebitAmount: settledStatus.debitAmount
      }
    }

    // --- No cached token: request interactive grant capped at wallet balance ---
    // The testnet auth server rejects limits that exceed the account balance.
    // Hardcode the known Shawn wallet balance as the cap. Once the user consents
    // once, the token is cached and all future payouts skip this step entirely.
    const GRANT_LIMIT_VALUE = '1000978899' // Shawn testnet balance (minor units)
    const outgoingGrant = await runStep('Request Shawn outgoing-payment grant', () =>
      client.grant.request(
        { url: senderWallet.authServer },
        {
          access_token: {
            access: [
              {
                identifier: senderWallet.id,
                type: 'outgoing-payment',
                actions: ['create', 'read'],
                limits: { debitAmount: { value: GRANT_LIMIT_VALUE, assetCode: debitAssetCode, assetScale: debitAssetScale } }
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

    if (isPendingGrant(outgoingGrant)) {
      transfers.set(transferId, {
        transferId,
        type: 'admin-payout',
        requestId: requestRecord.requestId,
        status: 'pending-consent',
        createdAt: new Date().toISOString(),
        senderWalletAddress: senderWallet.id,
        senderResourceServer: senderWallet.resourceServer,
        senderAuthServer: senderWallet.authServer,
        recipientWalletAddress: recipientWallet.id,
        incomingPaymentId: incomingPayment.id,
        quoteId: quote.id,
        quoteExpiresAt: quote.expiresAt,
        continueUri: outgoingGrant.continue.uri,
        continueAccessToken: outgoingGrant.continue.access_token.value,
        interactNonce: outgoingGrant.interact.finish,
        clientNonce,
        grantRequestUrl: senderWallet.authServer,
        keyId: donationRecipient.keyId,
        privateKeyPath: senderBundle.resolvedPrivateKeyPath,
        privateKeyIsTemp: senderBundle.isTempKey
      })

      tempPrivateKeyPathForCleanup = ''

      return {
        transferId,
        status: 'pending-consent',
        requiresConsent: true,
        redirectUrl: outgoingGrant.interact.redirect,
        outgoingPaymentId: null,
        outgoingSentAmount: null,
        outgoingDebitAmount: null
      }
    }

    const outgoingAccessToken = requireGrantAccessToken(outgoingGrant, 'Shawn outgoing grant')

    const outgoingPayment = await runStep('Create Shawn outgoing payment', () =>
      client.outgoingPayment.create(
        { url: senderWallet.resourceServer, accessToken: outgoingAccessToken },
        { walletAddress: senderWallet.id, quoteId: quote.id }
      )
    )

    const outgoingStatus = await pollOutgoingPayment({
      client,
      outgoingPaymentId: outgoingPayment.id,
      accessToken: outgoingAccessToken
    })

    const settledStatus = outgoingStatus || {
      id: outgoingPayment.id,
      failed: false,
      sentAmount: { value: '0', assetCode: quote.debitAmount.assetCode, assetScale: quote.debitAmount.assetScale },
      debitAmount: quote.debitAmount
    }

    const sentValue = amountValueToBigInt(settledStatus.sentAmount)
    const transferRecord = {
      transferId,
      type: 'admin-payout',
      requestId: requestRecord.requestId,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      senderWalletAddress: senderWallet.id,
      senderResourceServer: senderWallet.resourceServer,
      senderAuthServer: senderWallet.authServer,
      recipientWalletAddress: recipientWallet.id,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      quoteExpiresAt: quote.expiresAt,
      outgoingPaymentId: outgoingPayment.id,
      outgoingSentAmount: settledStatus.sentAmount,
      outgoingDebitAmount: settledStatus.debitAmount
    }

    if (settledStatus.failed) {
      transferRecord.status = 'failed'
      transferRecord.error =
        `Outgoing payment failed. sent=${formatAmountForHumans(settledStatus.sentAmount)} ` +
        `debit=${formatAmountForHumans(settledStatus.debitAmount)}`
      transfers.set(transferId, transferRecord)
      throw new Error(transferRecord.error)
    }

    if (sentValue === 0n) transferRecord.status = 'pending-settlement'

    transfers.set(transferId, transferRecord)

    if (tempPrivateKeyPathForCleanup && existsSync(tempPrivateKeyPathForCleanup)) {
      try { unlinkSync(tempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
      tempPrivateKeyPathForCleanup = ''
    }

    return {
      transferId,
      status: transferRecord.status,
      requiresConsent: false,
      redirectUrl: '',
      outgoingPaymentId: outgoingPayment.id,
      outgoingSentAmount: settledStatus.sentAmount,
      outgoingDebitAmount: settledStatus.debitAmount
    }
  } catch (error) {
    if (tempPrivateKeyPathForCleanup && existsSync(tempPrivateKeyPathForCleanup)) {
      try { unlinkSync(tempPrivateKeyPathForCleanup) } catch { /* Best-effort cleanup only. */ }
    }
    throw error
  }
}
