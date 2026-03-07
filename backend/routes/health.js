import express from 'express'
import { createUnauthenticatedClient } from '@interledger/open-payments'
import {
  DEFAULT_KEY_ID,
  DEFAULT_PRIVATE_KEY_PATH,
  ADMIN_USER_EMAIL,
  ADMIN_USER_PASSWORD,
  ENFORCE_CALLBACK_HASH,
  AUTO_APPROVAL_MAX_UNITS,
  NEEDY_HOUSEHOLD_MIN,
  NEEDY_PER_CAPITA_MAX_SGD,
  NEEDY_AMOUNT_BONUS_UNITS,
  AUTO_APPROVAL_AGENT_INTERVAL_MS,
  DONATION_RECIPIENT_WALLET_ADDRESS
} from '../src/config.js'
import { userAccounts } from '../src/store.js'
import { donationRecipientIsConfigured } from '../src/payments.js'
import { normalizeError, runStep } from '../src/helpers.js'
import { computeMetrics } from '../src/metrics.js'

const router = express.Router()

router.get('/api/health', (_req, res) => {
  return res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    defaultsConfigured: Boolean(DEFAULT_KEY_ID && DEFAULT_PRIVATE_KEY_PATH),
    enforceCallbackHash: ENFORCE_CALLBACK_HASH,
    donationRecipientConfigured: donationRecipientIsConfigured(),
    adminLoginConfigured: Boolean(ADMIN_USER_EMAIL && ADMIN_USER_PASSWORD),
    userAccountsStored: userAccounts.size,
    autoApproval: {
      maxUnits: AUTO_APPROVAL_MAX_UNITS,
      needyHouseholdMin: NEEDY_HOUSEHOLD_MIN,
      needyPerCapitaMaxSgd: NEEDY_PER_CAPITA_MAX_SGD,
      needyBonusUnits: NEEDY_AMOUNT_BONUS_UNITS,
      intervalMs: AUTO_APPROVAL_AGENT_INTERVAL_MS
    }
  })
})

router.get('/api/metrics', (_req, res) => {
  return res.json(computeMetrics())
})

router.get('/api/config', (_req, res) => {
  return res.json({
    donationRecipientWalletAddress: DONATION_RECIPIENT_WALLET_ADDRESS || null,
    donationRecipientConfigured: donationRecipientIsConfigured(),
    autoApprovalMaxUnits: AUTO_APPROVAL_MAX_UNITS,
    needyHouseholdMin: NEEDY_HOUSEHOLD_MIN,
    needyPerCapitaMaxSgd: NEEDY_PER_CAPITA_MAX_SGD
  })
})

router.get('/api/wallet-info', async (req, res) => {
  const walletAddressUrl = String(req.query.url || '').trim()
  if (!/^https?:\/\//i.test(walletAddressUrl)) {
    return res.status(400).json({ error: 'query param url must be a valid http(s) URL' })
  }

  try {
    const publicClient = await createUnauthenticatedClient({})
    const wallet = await runStep('Get wallet address information', () =>
      publicClient.walletAddress.get({ url: walletAddressUrl })
    )
    return res.json({
      id: wallet.id,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer
    })
  } catch (error) {
    const normalized = normalizeError(error)
    console.error('[wallet-info]', normalized)
    return res.status(500).json({ error: normalized })
  }
})

export default router
