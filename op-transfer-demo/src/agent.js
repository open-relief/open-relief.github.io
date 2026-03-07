import {
  AUTO_APPROVAL_MAX_UNITS,
  NEEDY_HOUSEHOLD_MIN,
  NEEDY_PER_CAPITA_MAX_SGD,
  NEEDY_AMOUNT_BONUS_UNITS
} from './config.js'
import { fundRequests, userAccounts, persistFundRequests } from './store.js'
import { normalizeError } from './helpers.js'
import { executeShawnPayoutForRequest } from './payments.js'

let autoApprovalAgentBusy = false

export function evaluateAutoApprovalForRequest(requestRecord) {
  const requestedAmount = Number(requestRecord.amount)
  const householdSize = Number(requestRecord.householdSize)
  const perCapitaIncomeSgd = Number(requestRecord.perCapitaIncomeSgd)

  if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
    return { eligible: false, isNeedy: false, approvedAmount: requestedAmount, reason: 'Invalid request amount' }
  }
  if (!Number.isInteger(householdSize) || householdSize <= 0) {
    return { eligible: false, isNeedy: false, approvedAmount: requestedAmount, reason: 'Missing or invalid household size' }
  }
  if (!Number.isFinite(perCapitaIncomeSgd) || perCapitaIncomeSgd <= 0) {
    return { eligible: false, isNeedy: false, approvedAmount: requestedAmount, reason: 'Missing or invalid per capita income' }
  }
  if (requestedAmount >= AUTO_APPROVAL_MAX_UNITS) {
    return { eligible: false, isNeedy: false, approvedAmount: requestedAmount, reason: `Auto-approval requires request amount < ${AUTO_APPROVAL_MAX_UNITS}` }
  }

  const isNeedy = householdSize >= NEEDY_HOUSEHOLD_MIN && perCapitaIncomeSgd < NEEDY_PER_CAPITA_MAX_SGD
  const affordabilityLimit = Math.max(1, Math.floor(perCapitaIncomeSgd * householdSize * 20))

  if (!isNeedy && requestedAmount > affordabilityLimit) {
    return { eligible: false, isNeedy, approvedAmount: requestedAmount, reason: `Request exceeds auto-approval affordability limit (${affordabilityLimit} units)` }
  }

  const capExclusive = Math.max(1, AUTO_APPROVAL_MAX_UNITS - 1)
  const approvedAmount = isNeedy
    ? Math.min(capExclusive, requestedAmount + NEEDY_AMOUNT_BONUS_UNITS)
    : requestedAmount

  return {
    eligible: true,
    isNeedy,
    approvedAmount,
    reason: isNeedy
      ? `Needy household criteria met; amount increased to ${approvedAmount}`
      : 'Auto-approval criteria met'
  }
}

export async function approveRequestAndTriggerPayout(requestRecord, { adminNote, approvedBy }) {
  if (!requestRecord) return { ok: false, httpStatus: 404, error: 'Request not found' }

  if (requestRecord.status === 'funded') {
    return { ok: false, httpStatus: 400, error: 'Request is already funded' }
  }

  if (!/^https?:\/\//i.test(String(requestRecord.requesterWalletAddress || '').trim())) {
    return { ok: false, httpStatus: 400, error: 'Cannot auto-payout because requesterWalletAddress is missing or invalid.' }
  }

  if (requestRecord.payoutStatus === 'pending-consent') {
    return { ok: false, httpStatus: 409, error: 'A payout for this request is waiting for Shawn consent. Complete the existing consent flow before retrying.', request: requestRecord }
  }

  if (requestRecord.payoutStatus === 'pending-settlement') {
    return { ok: false, httpStatus: 409, error: 'A payout for this request is already pending settlement. Wait for settlement before retrying.', request: requestRecord }
  }

  requestRecord.status = 'approved'
  requestRecord.adminNote = String(adminNote || '').trim()
  requestRecord.updatedAt = new Date().toISOString()
  requestRecord.payoutError = ''
  requestRecord.payoutRedirectUrl = null
  requestRecord.autoApprovedBy = String(approvedBy || 'unknown')

  try {
    const payout = await executeShawnPayoutForRequest(requestRecord)
    const now = new Date().toISOString()

    requestRecord.payoutStatus = payout.status
    requestRecord.payoutTransferId = payout.transferId
    requestRecord.payoutOutgoingPaymentId = payout.outgoingPaymentId
    requestRecord.payoutRedirectUrl = payout.redirectUrl || null
    requestRecord.updatedAt = now

    if (payout.status === 'completed') {
      requestRecord.status = 'funded'
      requestRecord.fundedAt = now
      requestRecord.fundedTransferId = payout.transferId
    }

    persistFundRequests()
    return { ok: true, request: requestRecord, payout }
  } catch (error) {
    const normalized = normalizeError(error)
    requestRecord.payoutStatus = 'failed'
    requestRecord.payoutError = normalized
    requestRecord.updatedAt = new Date().toISOString()
    requestRecord.status = 'approved'
    requestRecord.payoutRedirectUrl = null
    persistFundRequests()

    return { ok: false, httpStatus: 500, error: `Approved request but auto-payout failed: ${normalized}`, request: requestRecord }
  }
}

export async function autoApproveSingleRequest(requestRecord) {
  if (!requestRecord || requestRecord.status !== 'open') return null

  const requesterEmail = String(requestRecord.requesterEmail || '').trim().toLowerCase()
  const userRecord = userAccounts.get(requesterEmail)

  if (!userRecord) {
    requestRecord.autoReviewStatus = 'deferred'
    requestRecord.autoReviewReason = 'No linked user profile found for this request'
    requestRecord.updatedAt = new Date().toISOString()
    persistFundRequests()
    return { requestId: requestRecord.requestId, autoApproved: false, reason: requestRecord.autoReviewReason }
  }

  requestRecord.householdSize = Number(userRecord.householdSize)
  requestRecord.perCapitaIncomeSgd = Number(userRecord.perCapitaIncomeSgd)

  const evaluation = evaluateAutoApprovalForRequest(requestRecord)
  requestRecord.autoReviewReason = evaluation.reason
  requestRecord.updatedAt = new Date().toISOString()

  if (!evaluation.eligible) {
    requestRecord.autoReviewStatus = 'deferred'
    persistFundRequests()
    return { requestId: requestRecord.requestId, autoApproved: false, reason: evaluation.reason }
  }

  const originalAmount = String(requestRecord.requestedAmountOriginal || requestRecord.amount)
  requestRecord.requestedAmountOriginal = originalAmount
  requestRecord.amount = String(evaluation.approvedAmount)
  requestRecord.autoReviewStatus = 'approved'
  requestRecord.autoReviewReason = evaluation.reason

  const result = await approveRequestAndTriggerPayout(requestRecord, {
    adminNote: `Auto-approved by eligibility agent: ${evaluation.reason}`,
    approvedBy: 'auto-approval-agent'
  })

  if (!result.ok) {
    requestRecord.autoReviewStatus = 'failed'
    requestRecord.autoReviewReason = result.error
    requestRecord.updatedAt = new Date().toISOString()
    persistFundRequests()
    return { requestId: requestRecord.requestId, autoApproved: false, reason: result.error }
  }

  return {
    requestId: requestRecord.requestId,
    autoApproved: true,
    reason: evaluation.reason,
    payoutStatus: result.request.payoutStatus,
    requiresConsent: result.payout?.requiresConsent || false,
    redirectUrl: result.payout?.redirectUrl || null
  }
}

export async function runAutoApprovalAgent({ trigger = 'manual', requestId = '' } = {}) {
  if (autoApprovalAgentBusy) {
    return { skipped: true, reason: 'agent already running', trigger }
  }

  autoApprovalAgentBusy = true
  const outcomes = []

  try {
    const allOpen = Array.from(fundRequests.values()).filter((item) => item.status === 'open')
    const targets = requestId ? allOpen.filter((item) => item.requestId === requestId) : allOpen

    for (const record of targets) {
      try {
        const outcome = await autoApproveSingleRequest(record)
        if (outcome) outcomes.push(outcome)
      } catch (error) {
        outcomes.push({ requestId: record.requestId, autoApproved: false, reason: normalizeError(error) })
      }
    }

    return { skipped: false, trigger, processed: targets.length, outcomes }
  } finally {
    autoApprovalAgentBusy = false
  }
}
