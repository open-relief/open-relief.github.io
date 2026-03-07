import dotenv from 'dotenv'
import { join } from 'path'
import { tmpdir } from 'os'

dotenv.config()

export const PORT = Number(process.env.PORT || 3000)
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`
export const DEFAULT_KEY_ID = String(process.env.KEY_ID || '').trim()
export const DEFAULT_PRIVATE_KEY_PATH = String(process.env.PRIVATE_KEY_PATH || '').trim()
export const DONATION_RECIPIENT_KEY_ID = String(process.env.DONATION_RECIPIENT_KEY_ID || '').trim()
export const DONATION_RECIPIENT_PRIVATE_KEY_PATH = String(
  process.env.DONATION_RECIPIENT_PRIVATE_KEY_PATH || ''
).trim()
export const DONATION_RECIPIENT_WALLET_ADDRESS = String(
  process.env.DONATION_RECIPIENT_WALLET_ADDRESS || ''
).trim()
export const ADMIN_USER_EMAIL = String(process.env.ADMIN_USER_EMAIL || 'admin@example.com').trim()
export const ADMIN_USER_PASSWORD = String(
  process.env.ADMIN_USER_PASSWORD || 'change-me-password'
).trim()
export const ADMIN_SESSION_COOKIE_NAME = 'op_demo_admin_session'
export const ADMIN_SESSION_TTL_MS = Math.max(
  60_000,
  Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000)
)
export const USER_SESSION_COOKIE_NAME = 'op_demo_user_session'
export const USER_SESSION_TTL_MS = Math.max(
  60_000,
  Number(process.env.USER_SESSION_TTL_MS || 8 * 60 * 60 * 1000)
)
export const AUTO_APPROVAL_MAX_UNITS = Math.max(
  1,
  Number(process.env.AUTO_APPROVAL_MAX_UNITS || 100000)
)
export const NEEDY_HOUSEHOLD_MIN = Math.max(1, Number(process.env.NEEDY_HOUSEHOLD_MIN || 5))
export const NEEDY_PER_CAPITA_MAX_SGD = Math.max(
  1,
  Number(process.env.NEEDY_PER_CAPITA_MAX_SGD || 1300)
)
export const NEEDY_AMOUNT_BONUS_UNITS = Math.max(
  0,
  Number(process.env.NEEDY_AMOUNT_BONUS_UNITS || 10000)
)
export const AUTO_APPROVAL_AGENT_INTERVAL_MS = Math.max(
  10_000,
  Number(process.env.AUTO_APPROVAL_AGENT_INTERVAL_MS || 30_000)
)
export const ENFORCE_CALLBACK_HASH =
  String(process.env.ENFORCE_CALLBACK_HASH || 'false').toLowerCase() === 'true'
export const TEMP_KEY_DIR = join(tmpdir(), 'op-transfer-demo-keys')
export const DATA_DIR = join(process.cwd(), 'data')
export const APP_DATA_PATH = join(DATA_DIR, 'app-data.json')
