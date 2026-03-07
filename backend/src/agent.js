import { fundRequests, userAccounts, persistFundRequests } from './store.js'
import { normalizeError } from './helpers.js'
import { executeShawnPayoutForRequest } from './payments.js'
import { fetchGDACS, disasterTypeToGdacsCode } from './services/gdacs.js'
import { fetchHDX } from './services/hdx.js'
import { fetchGDELT } from './services/gdelt.js'
import { evaluateClaim } from './services/gemini.js'

let autoApprovalAgentBusy = false

/**
 * Use Gemini AI (with GDACS + World Bank + GDELT data) to evaluate whether
 * a fund request should be auto-approved. Falls back to rule-based scoring
 * if Gemini is unavailable.
 */
export async function evaluateAutoApprovalForRequest(requestRecord) {
  const requestedAmount = Number(requestRecord.amount)
  if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
    return { eligible: false, approvedAmount: requestedAmount, reason: 'Invalid request amount' }
  }

  // Map fund request fields to the claim format the AI expects
  const amountSGD = (requestedAmount / 100).toFixed(2)  // minor units → SGD (scale 2)
  const claim = {
    name: String(requestRecord.requesterName || requestRecord.requesterEmail || 'Unknown'),
    country: String(requestRecord.country || 'Unknown'),
    disasterType: String(requestRecord.disasterType || 'other'),
    incidentDate: String(requestRecord.incidentDate || requestRecord.createdAt || new Date().toISOString()),
    description: String(requestRecord.description || requestRecord.note || '(no description provided)'),
    amountSGD
  }

  console.log(`[agent] Evaluating claim via Gemini AI for ${claim.name} (${claim.country}, ${claim.disasterType})`)

  // Fetch disaster corroboration data in parallel
  const gdacsEventType = disasterTypeToGdacsCode(claim.disasterType)
  const [gdacsData, hdxData, gdeltData] = await Promise.all([
    fetchGDACS(claim.country, gdacsEventType, claim.incidentDate).catch(() => ({ found: false, summary: 'GDACS unavailable', events: [] })),
    fetchHDX(claim.country).catch(() => ({ found: false, summary: 'HDX unavailable' })),
    fetchGDELT(claim.country, claim.disasterType).catch(() => ({ found: false, summary: 'GDELT unavailable', articles: [] }))
  ])

  console.log(`[agent] GDACS: ${gdacsData.summary}`)
  console.log(`[agent] HDX:   ${hdxData.summary}`)
  console.log(`[agent] GDELT: ${gdeltData.summary}`)

  const evaluation = await evaluateClaim(claim, gdacsData, hdxData, gdeltData)

  console.log(`[agent] Gemini decision: ${evaluation.decision} (${evaluation.confidence}% confidence)`)
  if (evaluation.risk_flags?.length) {
    console.log(`[agent] Risk flags: ${evaluation.risk_flags.join('; ')}`)
  }

  const eligible = evaluation.decision === 'APPROVED'
  return {
    eligible,
    approvedAmount: requestedAmount,  // AI doesn't change the amount; admin can adjust
    reason: evaluation.reasoning || evaluation.decision,
    aiDecision: evaluation.decision,
    aiConfidence: evaluation.confidence,
    aiRiskFlags: evaluation.risk_flags || [],
    aiNote: evaluation.note || null
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

  let evaluation
  try {
    evaluation = await evaluateAutoApprovalForRequest(requestRecord)
  } catch (err) {
    console.error('[agent] AI evaluation threw unexpectedly:', normalizeError(err))
    evaluation = { eligible: false, approvedAmount: Number(requestRecord.amount), reason: `AI evaluation error: ${normalizeError(err)}` }
  }

  requestRecord.autoReviewReason = evaluation.reason
  requestRecord.autoReviewAiConfidence = evaluation.aiConfidence ?? null
  requestRecord.autoReviewAiRiskFlags = evaluation.aiRiskFlags ?? []
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

  const aiSummary = evaluation.aiConfidence != null
    ? `AI decision: ${evaluation.aiDecision} (${evaluation.aiConfidence}% confidence). ${evaluation.reason}`
    : evaluation.reason

  const result = await approveRequestAndTriggerPayout(requestRecord, {
    adminNote: `Auto-approved by Gemini AI agent: ${aiSummary}`,
    approvedBy: 'gemini-ai-agent'
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
    aiDecision: evaluation.aiDecision,
    aiConfidence: evaluation.aiConfidence,
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
