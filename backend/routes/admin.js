import express from 'express'
import { fundRequests, transfers, persistFundRequests, userAccounts } from '../src/store.js'
import { ensureAdmin } from '../src/sessions.js'
import { normalizeRequestStatus } from '../src/helpers.js'
import { runAutoApprovalAgent, approveRequestAndTriggerPayout } from '../src/agent.js'

const router = express.Router()

router.get('/api/admin/users', (req, res) => {
  if (!ensureAdmin(req, res)) return
  const users = Array.from(userAccounts.values()).map(({ passwordHash, passwordSalt, privateKey, ...safe }) => safe)
  return res.json(users)
})

router.get('/api/admin/requests', (req, res) => {
  if (!ensureAdmin(req, res)) return
  const values = Array.from(fundRequests.values()).sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  )
  return res.json(values)
})

router.get('/api/admin/overview', (req, res) => {
  if (!ensureAdmin(req, res)) return

  const requests = Array.from(fundRequests.values())
  const donationTransfers = Array.from(transfers.values()).filter((t) => t.type === 'donation')
  const adminPayoutTransfers = Array.from(transfers.values()).filter((t) => t.type === 'admin-payout')

  return res.json({
    requestsTotal: requests.length,
    requestsByStatus: {
      open: requests.filter((r) => r.status === 'open').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
      funded: requests.filter((r) => r.status === 'funded').length
    },
    donationTransfersTotal: donationTransfers.length,
    donationTransfersCompleted: donationTransfers.filter((t) => t.status === 'completed').length,
    adminPayoutTransfersTotal: adminPayoutTransfers.length,
    adminPayoutTransfersCompleted: adminPayoutTransfers.filter((t) => t.status === 'completed').length,
    adminPayoutTransfersPendingSettlement: adminPayoutTransfers.filter((t) => t.status === 'pending-settlement').length,
    adminPayoutTransfersFailed: adminPayoutTransfers.filter((t) => t.status === 'failed').length
  })
})

router.post('/api/admin/agent/run', async (req, res) => {
  if (!ensureAdmin(req, res)) return
  const requestId = String(req.body?.requestId || '').trim()
  const result = await runAutoApprovalAgent({ trigger: 'admin-manual', requestId })
  return res.json(result)
})

router.patch('/api/admin/requests/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) return

  const requestRecord = fundRequests.get(req.params.id)
  if (!requestRecord) return res.status(404).json({ error: 'Request not found' })

  const status = normalizeRequestStatus(req.body?.status)
  const adminNote = String(req.body?.adminNote || '').trim()

  if (!status) {
    return res.status(400).json({ error: 'status must be one of: open, approved, rejected, funded' })
  }

  if (status === 'approved') {
    const approvalResult = await approveRequestAndTriggerPayout(requestRecord, {
      adminNote,
      approvedBy: req.adminUser?.email || 'admin'
    })

    if (!approvalResult.ok) {
      return res.status(approvalResult.httpStatus || 500).json({
        error: approvalResult.error,
        request: approvalResult.request || requestRecord
      })
    }

    const payout = approvalResult.payout || {}
    return res.json({
      ...approvalResult.request,
      autoPayoutTriggered: true,
      autoPayoutTransferId: payout.transferId || null,
      requiresConsent: Boolean(payout.requiresConsent),
      redirectUrl: payout.redirectUrl || null
    })
  }

  requestRecord.status = status
  requestRecord.adminNote = adminNote
  requestRecord.updatedAt = new Date().toISOString()
  persistFundRequests()
  return res.json(requestRecord)
})

export default router
