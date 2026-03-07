import { fundRequests, transfers, userAccounts } from './store.js'

/**
 * Returns a plain object with all platform metrics derived from in-memory state.
 * All amount fields are in minor units (integer strings become Numbers here).
 */
export function computeMetrics() {
  const requests = Array.from(fundRequests.values())
  const allTransfers = Array.from(transfers.values())
  const donationTransfers = allTransfers.filter((t) => t.type === 'donation')
  const payoutTransfers = allTransfers.filter((t) => t.type === 'admin-payout')

  // ── Request counts ──────────────────────────────────────────────────────────
  const requestsByStatus = {
    open: 0,
    approved: 0,
    funded: 0,
    rejected: 0
  }
  for (const r of requests) {
    if (requestsByStatus[r.status] !== undefined) requestsByStatus[r.status]++
  }

  // ── Amount totals (minor units) ─────────────────────────────────────────────
  let totalAmountRequested = 0
  let totalAmountApproved = 0
  let totalAmountFunded = 0
  let totalBonusAwarded = 0

  for (const r of requests) {
    const original = Number(r.requestedAmountOriginal || r.amount || 0)
    const approved = Number(r.amount || 0)

    totalAmountRequested += original

    if (r.status === 'approved' || r.status === 'funded') {
      totalAmountApproved += approved
    }

    if (r.status === 'funded' || (r.status === 'approved' && r.autoReviewStatus === 'approved')) {
      totalAmountFunded += approved
    }

    // Bonus was awarded when the approved amount exceeds the original request
    if (approved > original) {
      totalBonusAwarded += approved - original
    }
  }

  // ── Auto-approval stats ─────────────────────────────────────────────────────
  const autoApprovedCount = requests.filter((r) => r.autoReviewStatus === 'approved').length
  const autoDeferredCount = requests.filter((r) => r.autoReviewStatus === 'deferred').length
  const needyBonusCount = requests.filter((r) => Number(r.amount || 0) > Number(r.requestedAmountOriginal || r.amount || 0)).length

  // ── Donation transfer stats ─────────────────────────────────────────────────
  const donationsByStatus = {
    pendingConsent: donationTransfers.filter((t) => t.status === 'pending-consent').length,
    pendingSettlement: donationTransfers.filter((t) => t.status === 'pending-settlement').length,
    completed: donationTransfers.filter((t) => t.status === 'completed').length,
    failed: donationTransfers.filter((t) => t.status === 'failed').length
  }

  // Sum donated amount from completed donation transfers
  let totalAmountDonated = 0
  let donationAssetCode = ''
  let donationAssetScale = 0
  for (const t of donationTransfers) {
    if (t.status === 'completed' && t.outgoingSentAmount?.value) {
      totalAmountDonated += Number(t.outgoingSentAmount.value || 0)
      if (!donationAssetCode && t.outgoingSentAmount.assetCode) {
        donationAssetCode = t.outgoingSentAmount.assetCode
        donationAssetScale = Number(t.outgoingSentAmount.assetScale || 0)
      }
    }
  }

  // ── Payout transfer stats ───────────────────────────────────────────────────
  const payoutsByStatus = {
    pendingConsent: payoutTransfers.filter((t) => t.status === 'pending-consent').length,
    pendingSettlement: payoutTransfers.filter((t) => t.status === 'pending-settlement').length,
    completed: payoutTransfers.filter((t) => t.status === 'completed').length,
    failed: payoutTransfers.filter((t) => t.status === 'failed').length
  }

  return {
    computedAt: new Date().toISOString(),

    // Users
    totalUsers: userAccounts.size,

    // Requests
    totalRequests: requests.length,
    requestsByStatus,
    totalAmountRequested,
    totalAmountApproved,
    totalAmountFunded,
    totalBonusAwarded,
    autoApprovedCount,
    autoDeferredCount,
    needyBonusCount,

    // Donations
    totalDonations: donationTransfers.length,
    donationsByStatus,
    totalAmountDonated,
    donationAssetCode: donationAssetCode || null,
    donationAssetScale,

    // Payouts
    totalPayouts: payoutTransfers.length,
    payoutsByStatus
  }
}
