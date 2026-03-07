import express from 'express'
import { randomUUID } from 'crypto'
import { ADMIN_USER_EMAIL } from '../src/config.js'
import { fundRequests, persistFundRequests } from '../src/store.js'
import { ensureUser, normalizeEmailAddress } from '../src/sessions.js'
import { toPublicRequest, normalizeRequestStatus } from '../src/helpers.js'
import { runAutoApprovalAgent } from '../src/agent.js'

const router = express.Router()

router.post('/api/requests', async (req, res) => {
  if (!ensureUser(req, res)) return

  if (normalizeEmailAddress(req.user.email) === normalizeEmailAddress(ADMIN_USER_EMAIL)) {
    return res.status(403).json({ error: 'Admin accounts are not permitted to receive payments' })
  }

  const requesterName = String(req.body?.requesterName || '').trim() || req.user.email
  const requesterWalletAddress = String(req.user.pointer || '').trim()
  const amount = String(req.body?.amount || '').trim()
  const note = String(req.body?.note || '').trim()

  if (!/^\d+$/.test(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive integer string' })
  }
  if (!/^https?:\/\//i.test(requesterWalletAddress)) {
    return res.status(400).json({ error: 'requesterWalletAddress must be a valid http(s) wallet URL' })
  }

  const requestId = randomUUID()
  const now = new Date().toISOString()
  const record = {
    requestId,
    requesterName,
    requesterEmail: req.user.email,
    requesterWalletAddress,
    amount,
    requestedAmountOriginal: amount,
    note,
    householdSize: Number(req.user.householdSize),
    perCapitaIncomeSgd: Number(req.user.perCapitaIncomeSgd),
    status: 'open',
    createdAt: now,
    updatedAt: now,
    fundedAt: null,
    fundedTransferId: null,
    payoutStatus: null,
    payoutError: '',
    payoutTransferId: null,
    payoutOutgoingPaymentId: null,
    payoutRedirectUrl: null,
    autoReviewStatus: 'pending',
    autoReviewReason: '',
    adminNote: ''
  }

  fundRequests.set(requestId, record)
  persistFundRequests()

  const autoOutcome = await runAutoApprovalAgent({ trigger: 'request-created', requestId })

  const latest = fundRequests.get(requestId) || record
  return res.status(201).json({ ...toPublicRequest(latest), autoAgent: autoOutcome })
})

router.get('/api/requests', (req, res) => {
  const requestedStatus = normalizeRequestStatus(req.query.status)
  let values = Array.from(fundRequests.values())
  if (requestedStatus) values = values.filter((item) => item.status === requestedStatus)
  values.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return res.json(values.map(toPublicRequest))
})

export default router
