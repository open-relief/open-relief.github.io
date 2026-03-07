import express from 'express'
import { randomUUID } from 'crypto'
import { USER_SESSION_COOKIE_NAME, USER_SESSION_TTL_MS } from '../src/config.js'
import { userAccounts, persistUsers } from '../src/store.js'
import {
  createUserSession,
  getUserSessionFromRequest,
  destroyUserSessionFromRequest,
  buildSessionCookieValue,
  buildClearSessionCookieValue,
  normalizeEmailAddress,
  isValidEmailAddress,
  hashPasswordForStorage,
  verifyPasswordAgainstHash
} from '../src/sessions.js'
import { toPublicUser } from '../src/helpers.js'

const router = express.Router()

router.post('/api/users/signup', (req, res) => {
  const email = normalizeEmailAddress(req.body?.email)
  const password = String(req.body?.password || '')
  const pointer = String(req.body?.pointer || '').trim()
  const keyId = String(req.body?.keyId || '').trim()
  const privateKey = String(req.body?.privateKey || '').trim()
  const householdSize = Number(req.body?.householdSize)
  const perCapitaIncomeSgd = Number(req.body?.perCapitaIncomeSgd)

  if (!isValidEmailAddress(email)) return res.status(400).json({ error: 'A valid email is required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (!/^https?:\/\//i.test(pointer)) return res.status(400).json({ error: 'pointer must be a valid http(s) wallet URL' })
  if (!keyId) return res.status(400).json({ error: 'keyId is required' })
  if (!privateKey) return res.status(400).json({ error: 'privateKey is required' })
  if (!Number.isInteger(householdSize) || householdSize <= 0) return res.status(400).json({ error: 'householdSize must be a positive integer' })
  if (!Number.isFinite(perCapitaIncomeSgd) || perCapitaIncomeSgd <= 0) return res.status(400).json({ error: 'perCapitaIncomeSgd must be a positive number' })
  if (userAccounts.has(email)) return res.status(409).json({ error: 'An account with this email already exists' })

  const passwordHash = hashPasswordForStorage(password)
  const now = new Date().toISOString()
  const userRecord = {
    userId: randomUUID(),
    email,
    passwordHash: passwordHash.hash,
    passwordSalt: passwordHash.salt,
    pointer,
    keyId,
    privateKey,
    householdSize,
    perCapitaIncomeSgd,
    createdAt: now,
    updatedAt: now
  }

  userAccounts.set(email, userRecord)
  persistUsers()

  return res.status(201).json({ ok: true, user: toPublicUser(userRecord) })
})

router.post('/api/users/login', (req, res) => {
  const email = normalizeEmailAddress(req.body?.email)
  const password = String(req.body?.password || '')

  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

  const userRecord = userAccounts.get(email)
  if (!userRecord) return res.status(401).json({ error: 'Invalid email or password' })

  const validPassword = verifyPasswordAgainstHash(password, userRecord.passwordSalt, userRecord.passwordHash)
  if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' })

  const session = createUserSession(userRecord)
  res.setHeader(
    'Set-Cookie',
    buildSessionCookieValue(USER_SESSION_COOKIE_NAME, session.sessionId, USER_SESSION_TTL_MS)
  )
  return res.json({ ok: true, user: toPublicUser(userRecord) })
})

router.get('/api/users/me', (req, res) => {
  const session = getUserSessionFromRequest(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const userRecord = userAccounts.get(String(session.email || '').toLowerCase())
  if (!userRecord) return res.status(401).json({ error: 'User account no longer exists' })

  return res.json({ authenticated: true, user: toPublicUser(userRecord) })
})

router.post('/api/users/logout', (req, res) => {
  destroyUserSessionFromRequest(req)
  res.setHeader('Set-Cookie', buildClearSessionCookieValue(USER_SESSION_COOKIE_NAME))
  return res.json({ ok: true })
})

export default router
