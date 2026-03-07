import { randomUUID, scryptSync, randomBytes } from 'crypto'
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  USER_SESSION_COOKIE_NAME,
  USER_SESSION_TTL_MS,
  PUBLIC_BASE_URL
} from './config.js'
import { adminSessions, userSessions, userAccounts } from './store.js'
import { safeEqualText } from './helpers.js'

export function parseCookies(req) {
  const cookieHeader = String(req.headers?.cookie || '').trim()
  if (!cookieHeader) return {}

  const parsed = {}
  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...rawRest] = pair.split('=')
    const key = String(rawKey || '').trim()
    if (!key) continue
    const rawValue = rawRest.join('=').trim()
    try {
      parsed[key] = decodeURIComponent(rawValue)
    } catch {
      parsed[key] = rawValue
    }
  }
  return parsed
}

export function shouldUseSecureCookies() {
  return /^https:\/\//i.test(PUBLIC_BASE_URL)
}

export function buildSessionCookieValue(cookieName, sessionId, ttlMs) {
  const maxAgeSeconds = Math.max(1, Math.floor(ttlMs / 1000))
  const attrs = [
    `${cookieName}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax'
  ]
  if (shouldUseSecureCookies()) attrs.push('Secure')
  return attrs.join('; ')
}

export function buildClearSessionCookieValue(cookieName) {
  const attrs = [`${cookieName}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (shouldUseSecureCookies()) attrs.push('Secure')
  return attrs.join('; ')
}

export function createSession({ sessionMap, ttlMs, payload }) {
  const sessionId = randomUUID()
  const expiresAt = Date.now() + ttlMs
  sessionMap.set(sessionId, { sessionId, createdAt: new Date().toISOString(), expiresAt, ...payload })
  return { sessionId, expiresAt }
}

export function getSessionFromRequest(req, { sessionMap, cookieName }) {
  const cookies = parseCookies(req)
  const sessionId = String(cookies[cookieName] || '').trim()
  if (!sessionId) return null

  const session = sessionMap.get(sessionId)
  if (!session) return null

  if (session.expiresAt <= Date.now()) {
    sessionMap.delete(sessionId)
    return null
  }
  return session
}

export function destroySessionFromRequest(req, { sessionMap, cookieName }) {
  const session = getSessionFromRequest(req, { sessionMap, cookieName })
  if (!session) return
  sessionMap.delete(session.sessionId)
}

export function createAdminSession(email) {
  return createSession({ sessionMap: adminSessions, ttlMs: ADMIN_SESSION_TTL_MS, payload: { email } })
}

export function getAdminSessionFromRequest(req) {
  return getSessionFromRequest(req, { sessionMap: adminSessions, cookieName: ADMIN_SESSION_COOKIE_NAME })
}

export function destroyAdminSessionFromRequest(req) {
  destroySessionFromRequest(req, { sessionMap: adminSessions, cookieName: ADMIN_SESSION_COOKIE_NAME })
}

export function createUserSession(userRecord) {
  return createSession({
    sessionMap: userSessions,
    ttlMs: USER_SESSION_TTL_MS,
    payload: { userId: userRecord.userId, email: userRecord.email }
  })
}

export function getUserSessionFromRequest(req) {
  return getSessionFromRequest(req, { sessionMap: userSessions, cookieName: USER_SESSION_COOKIE_NAME })
}

export function destroyUserSessionFromRequest(req) {
  destroySessionFromRequest(req, { sessionMap: userSessions, cookieName: USER_SESSION_COOKIE_NAME })
}

export function ensureAdmin(req, res) {
  const session = getAdminSessionFromRequest(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized admin request' })
    return false
  }
  req.adminUser = { email: session.email }
  return true
}

export function ensureUser(req, res) {
  const session = getUserSessionFromRequest(req)
  if (!session) {
    res.status(401).json({ error: 'User login required' })
    return false
  }
  const userRecord = userAccounts.get(String(session.email || '').toLowerCase())
  if (!userRecord) {
    res.status(401).json({ error: 'User account no longer exists' })
    return false
  }
  req.user = userRecord
  return true
}

export function normalizeEmailAddress(value) {
  return String(value || '').trim().toLowerCase()
}

export function isValidEmailAddress(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function hashPasswordForStorage(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPasswordAgainstHash(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const actualHash = scryptSync(password, salt, 64).toString('hex')
  return safeEqualText(actualHash, expectedHash)
}
