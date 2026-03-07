import { createHash, timingSafeEqual } from 'crypto'

export function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function toBase64NoPadding(buffer) {
  return buffer.toString('base64').replace(/=+$/g, '')
}

export function safeEqualText(a, b) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export function unique(items) {
  return Array.from(new Set(items.filter(Boolean)))
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function extractErrorDetails(error) {
  if (!(error instanceof Error)) return 'Unknown server error'

  const details = [error.message]

  const cause = error.cause
  if (cause instanceof Error && cause.message) details.push(`cause=${cause.message}`)

  const statusCode = error.statusCode || error.status
  if (statusCode) details.push(`status=${statusCode}`)

  if (typeof error.code === 'string' && error.code) details.push(`code=${error.code}`)

  const responseStatus = error.response?.status
  if (responseStatus) details.push(`responseStatus=${responseStatus}`)

  const responseData = error.response?.data
  if (typeof responseData === 'string' && responseData.trim()) {
    details.push(`responseData=${responseData.trim()}`)
  } else if (responseData && typeof responseData === 'object') {
    try {
      details.push(`responseData=${JSON.stringify(responseData)}`)
    } catch {
      // Ignore non-serializable response data.
    }
  }

  return unique(details).join(' | ')
}

export function wrapStepError(stepName, error) {
  const wrapped = new Error(`${stepName} failed: ${extractErrorDetails(error)}`)
  wrapped.cause = error
  return wrapped
}

export async function runStep(stepName, task) {
  try {
    return await task()
  } catch (error) {
    throw wrapStepError(stepName, error)
  }
}

export function normalizeError(error) {
  if (!(error instanceof Error)) return 'Unknown server error'

  if (/ENOENT|no such file/i.test(error.message)) {
    return 'Private key file was not found. Verify privateKeyPath exists on the server.'
  }

  return extractErrorDetails(error)
}

export function wrapPemBody(base64Body) {
  return base64Body.match(/.{1,64}/g)?.join('\n') || base64Body
}

export function convertPrivateKeyToPemIfNeeded(input) {
  const trimmed = String(input || '').trim()
  if (!trimmed) return null

  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(trimmed)) {
    return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`
  }

  const compact = trimmed.replace(/\s+/g, '')

  if (compact.startsWith('PRIV')) {
    const body = compact.slice(4)
    if (/^[A-Za-z0-9+/=]+$/.test(body) && body.length >= 40) {
      return `-----BEGIN PRIVATE KEY-----\n${wrapPemBody(body)}\n-----END PRIVATE KEY-----\n`
    }
  }

  if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length >= 40) {
    return `-----BEGIN PRIVATE KEY-----\n${wrapPemBody(compact)}\n-----END PRIVATE KEY-----\n`
  }

  return null
}

export function buildCallbackHtml({ title, message, details, isError = false }) {
  const color = isError ? '#b42318' : '#107a36'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Segoe UI, Tahoma, Arial, sans-serif; background: #f5f7ff; color: #1f2942; margin: 0; }
      .wrap { max-width: 760px; margin: 48px auto; padding: 0 16px; }
      .card { background: white; border: 1px solid #dde3f5; border-radius: 12px; padding: 22px; }
      h1 { margin: 0 0 10px; color: ${color}; }
      p { margin: 0 0 8px; }
      pre { background: #f3f5fb; border: 1px solid #dde3f5; border-radius: 8px; padding: 10px; overflow-x: auto; }
      a { color: #1b7cff; text-decoration: none; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        ${details ? `<pre>${details}</pre>` : ''}
        <p><a href="/">Start another transfer</a></p>
      </section>
    </main>
  </body>
</html>`
}

export function calculateInteractionHashCandidates({
  clientNonce,
  interactNonce,
  interactRef,
  grantRequestUrl
}) {
  const baseUrls = [grantRequestUrl]
  if (grantRequestUrl.endsWith('/')) {
    baseUrls.push(grantRequestUrl.slice(0, -1))
  } else {
    baseUrls.push(`${grantRequestUrl}/`)
  }

  const candidates = []

  for (const url of unique(baseUrls)) {
    const hashBase = `${clientNonce}\n${interactNonce}\n${interactRef}\n${url}`
    const digest = createHash('sha256').update(hashBase, 'ascii').digest()
    candidates.push(toBase64Url(digest))
    candidates.push(toBase64NoPadding(digest))
  }

  return unique(candidates)
}

export function requireGrantAccessToken(grant, context) {
  if (!grant || !grant.access_token || !grant.access_token.value) {
    throw new Error(`Expected access token for ${context}`)
  }
  return grant.access_token.value
}

export function amountValueToBigInt(amount) {
  const value = String(amount?.value || '0').trim()
  if (!/^\d+$/.test(value)) return 0n
  return BigInt(value)
}

export function formatAmountForHumans(amount) {
  if (!amount || typeof amount !== 'object') return '0'

  const value = String(amount.value || '0')
  const assetCode = String(amount.assetCode || '')
  const assetScale = Number(amount.assetScale || 0)

  if (!/^\d+$/.test(value) || assetScale < 0) return `${value} ${assetCode}`.trim()

  const integer = value.padStart(assetScale + 1, '0')
  const whole = integer.slice(0, integer.length - assetScale) || '0'
  const frac = assetScale > 0 ? integer.slice(integer.length - assetScale) : ''
  const normalized = assetScale > 0 ? `${whole}.${frac}` : whole
  return `${normalized} ${assetCode}`.trim()
}

export function normalizeRequestStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (['open', 'approved', 'rejected', 'funded'].includes(value)) return value
  return ''
}

export function toPublicRequest(request) {
  return {
    requestId: request.requestId,
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail || null,
    requesterWalletAddress: request.requesterWalletAddress,
    amount: request.amount,
    requestedAmountOriginal: request.requestedAmountOriginal || request.amount,
    note: request.note,
    householdSize: request.householdSize ?? null,
    perCapitaIncomeSgd: request.perCapitaIncomeSgd ?? null,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    fundedAt: request.fundedAt || null,
    fundedTransferId: request.fundedTransferId || null,
    payoutStatus: request.payoutStatus || null,
    payoutError: request.payoutError || null,
    payoutTransferId: request.payoutTransferId || null,
    payoutOutgoingPaymentId: request.payoutOutgoingPaymentId || null,
    payoutRedirectUrl: request.payoutRedirectUrl || null,
    autoReviewStatus: request.autoReviewStatus || 'pending',
    autoReviewReason: request.autoReviewReason || ''
  }
}

export function toPublicUser(userRecord) {
  return {
    userId: userRecord.userId,
    email: userRecord.email,
    pointer: userRecord.pointer,
    keyId: userRecord.keyId,
    householdSize: userRecord.householdSize,
    perCapitaIncomeSgd: userRecord.perCapitaIncomeSgd,
    createdAt: userRecord.createdAt,
    updatedAt: userRecord.updatedAt
  }
}
