import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { APP_DATA_PATH, DATA_DIR } from './config.js'
import { normalizeRequestStatus } from './helpers.js'

mkdirSync(DATA_DIR, { recursive: true })

export const transfers = new Map()
export const fundRequests = new Map()
export const adminSessions = new Map()
export const userSessions = new Map()
export const userAccounts = new Map()

// Cached outgoing-payment access token — reused to skip re-consent for subsequent payouts
let _cachedOutgoingToken = null // { value, expiresAt, resourceServer, walletAddress }

export function setCachedOutgoingToken({ value, expiresAt, resourceServer, walletAddress }) {
  _cachedOutgoingToken = { value, expiresAt, resourceServer, walletAddress }
  console.log('[token-cache] Outgoing payment token cached. Expires:', expiresAt)
}

export function getCachedOutgoingToken(walletAddress) {
  if (!_cachedOutgoingToken) return null
  if (_cachedOutgoingToken.walletAddress !== walletAddress) return null
  if (new Date(_cachedOutgoingToken.expiresAt) <= new Date()) {
    console.log('[token-cache] Cached token expired, clearing.')
    _cachedOutgoingToken = null
    return null
  }
  return _cachedOutgoingToken
}

export function clearCachedOutgoingToken() {
  _cachedOutgoingToken = null
}

function createEmptyAppDataStore() {
  return { users: [], requests: [] }
}

export function normalizeStoredRequestRecord(stored) {
  if (!stored || typeof stored !== 'object') return null

  const requestId = String(stored.requestId || '').trim()
  if (!requestId) return null

  const now = new Date().toISOString()
  return {
    requestId,
    requesterName: String(stored.requesterName || '').trim() || 'Unknown User',
    requesterEmail: String(stored.requesterEmail || '').trim().toLowerCase() || null,
    requesterWalletAddress: String(stored.requesterWalletAddress || '').trim(),
    amount: String(stored.amount || '').trim() || '0',
    requestedAmountOriginal:
      String(stored.requestedAmountOriginal || stored.amount || '').trim() || '0',
    note: String(stored.note || '').trim(),
    householdSize: Number.isInteger(Number(stored.householdSize))
      ? Number(stored.householdSize)
      : null,
    perCapitaIncomeSgd: Number.isFinite(Number(stored.perCapitaIncomeSgd))
      ? Number(stored.perCapitaIncomeSgd)
      : null,
    status: normalizeRequestStatus(stored.status) || 'open',
    createdAt: String(stored.createdAt || now),
    updatedAt: String(stored.updatedAt || now),
    fundedAt: stored.fundedAt ? String(stored.fundedAt) : null,
    fundedTransferId: stored.fundedTransferId ? String(stored.fundedTransferId) : null,
    payoutStatus: stored.payoutStatus ? String(stored.payoutStatus) : null,
    payoutError: String(stored.payoutError || ''),
    payoutTransferId: stored.payoutTransferId ? String(stored.payoutTransferId) : null,
    payoutOutgoingPaymentId: stored.payoutOutgoingPaymentId
      ? String(stored.payoutOutgoingPaymentId)
      : null,
    payoutRedirectUrl: stored.payoutRedirectUrl ? String(stored.payoutRedirectUrl) : null,
    autoReviewStatus: String(stored.autoReviewStatus || 'pending'),
    autoReviewReason: String(stored.autoReviewReason || ''),
    adminNote: String(stored.adminNote || '')
  }
}

export function loadOrCreateAppDataStore() {
  if (!existsSync(APP_DATA_PATH)) {
    const seed = createEmptyAppDataStore()
    writeFileSync(APP_DATA_PATH, JSON.stringify(seed, null, 2), 'utf8')
    return seed
  }

  try {
    const raw = readFileSync(APP_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const users = Array.isArray(parsed?.users) ? parsed.users : []
    const requests = Array.isArray(parsed?.requests) ? parsed.requests : []
    return { users, requests }
  } catch {
    const seed = createEmptyAppDataStore()
    writeFileSync(APP_DATA_PATH, JSON.stringify(seed, null, 2), 'utf8')
    return seed
  }
}

export function persistAppDataStore() {
  const payload = {
    users: Array.from(userAccounts.values()),
    requests: Array.from(fundRequests.values())
  }
  writeFileSync(APP_DATA_PATH, JSON.stringify(payload, null, 2), 'utf8')
}

export function persistFundRequests() {
  persistAppDataStore()
}

export function persistUsers() {
  persistAppDataStore()
}

// Boot-time load — runs once when this module is first imported.
const initialDataStore = loadOrCreateAppDataStore()

for (const storedUser of initialDataStore.users) {
  const email = String(storedUser?.email || '').trim().toLowerCase()
  if (!email) continue
  userAccounts.set(email, storedUser)
}

for (const storedRequest of initialDataStore.requests) {
  const normalized = normalizeStoredRequestRecord(storedRequest)
  if (!normalized) continue
  fundRequests.set(normalized.requestId, normalized)
}
