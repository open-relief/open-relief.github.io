import express from 'express'
import cors from 'cors'
import { PORT, PUBLIC_BASE_URL, APP_DATA_PATH, AUTO_APPROVAL_AGENT_INTERVAL_MS } from './src/config.js'
import { runAutoApprovalAgent } from './src/agent.js'
import { normalizeError } from './src/helpers.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import requestsRouter from './routes/requests.js'
import adminRouter from './routes/admin.js'
import donationsRouter from './routes/donations.js'
import transfersRouter from './routes/transfers.js'
import callbacksRouter from './routes/callbacks.js'

const app = express()

// Allow the GitHub Pages frontend (and localhost dev) to call this API
app.use(cors({
  origin: [
    'https://open-relief.github.io',
    'http://localhost:3000',
    'http://localhost:3001',
    /^http:\/\/localhost(:\d+)?$/,
  ],
  credentials: true,
}))

app.use(express.json())
app.use(express.static('public'))

app.use(healthRouter)
app.use(authRouter)
app.use(usersRouter)
app.use(requestsRouter)
app.use(adminRouter)
app.use(donationsRouter)
app.use(transfersRouter)
app.use(callbacksRouter)

setInterval(() => {
  runAutoApprovalAgent({ trigger: 'interval' }).catch((error) => {
    console.error('[auto-approval-agent]', normalizeError(error))
  })
}, AUTO_APPROVAL_AGENT_INTERVAL_MS)

app.listen(PORT, () => {
  console.log(`Open Payments demo server listening on ${PUBLIC_BASE_URL}`)
  console.log(`User/request datastore: ${APP_DATA_PATH}`)
})
