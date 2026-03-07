import express from 'express'
import {
  ADMIN_USER_EMAIL,
  ADMIN_USER_PASSWORD,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS
} from '../src/config.js'
import {
  createAdminSession,
  getAdminSessionFromRequest,
  destroyAdminSessionFromRequest,
  buildSessionCookieValue,
  buildClearSessionCookieValue
} from '../src/sessions.js'
import { safeEqualText } from '../src/helpers.js'

const router = express.Router()

router.post('/api/auth/login', (req, res) => {
  const emailInput = String(req.body?.email || '').trim().toLowerCase()
  const passwordInput = String(req.body?.password || '')
  const configuredEmail = String(ADMIN_USER_EMAIL || '').trim().toLowerCase()

  if (!configuredEmail || !ADMIN_USER_PASSWORD) {
    return res.status(500).json({
      error: 'Admin login is not configured. Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD.'
    })
  }

  if (!emailInput || !passwordInput) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const validEmail = safeEqualText(emailInput, configuredEmail)
  const validPassword = safeEqualText(passwordInput, ADMIN_USER_PASSWORD)

  if (!validEmail || !validPassword) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const session = createAdminSession(configuredEmail)
  res.setHeader(
    'Set-Cookie',
    buildSessionCookieValue(ADMIN_SESSION_COOKIE_NAME, session.sessionId, ADMIN_SESSION_TTL_MS)
  )
  return res.json({ ok: true, user: { email: configuredEmail } })
})

router.get('/api/auth/me', (req, res) => {
  const session = getAdminSessionFromRequest(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
  return res.json({ authenticated: true, user: { email: session.email } })
})

router.post('/api/auth/logout', (req, res) => {
  destroyAdminSessionFromRequest(req)
  res.setHeader('Set-Cookie', buildClearSessionCookieValue(ADMIN_SESSION_COOKIE_NAME))
  return res.json({ ok: true })
})

export default router
