# Disaster Aid Claim Verifier

An AI-powered financial aid claim evaluation system for disaster victims. Claimants submit their situation via a web form; the system cross-references live disaster databases and uses Google Gemini to produce an APPROVE/REJECT verdict with full reasoning.

## How It Works

1. **User submits a claim** — name, country, disaster type, date, description, amount requested
2. **Backend fires 3 parallel API calls:**
   - **GDACS** — verifies a real disaster event exists (earthquake magnitude, cyclone category, flood severity, affected population)
   - **HDX/HAPI** — checks humanitarian crisis indicators (displaced populations, food insecurity, poverty levels)
   - **GDELT** — corroborates with news coverage (updated ~15 min, geo-tagged)
3. **Gemini AI** evaluates all data against the claim and returns a structured verdict
4. **If APPROVED** — a Stripe PaymentIntent is created (test mode) for the requested amount

## Project Structure

```
AI/
├── backend/
│   ├── server.js
│   ├── routes/claims.js
│   ├── services/
│   │   ├── gdacs.js       ← GDACS disaster events
│   │   ├── hdx.js         ← HDX/HAPI humanitarian data
│   │   ├── gdelt.js       ← GDELT news corroboration
│   │   ├── gemini.js      ← Gemini AI evaluation
│   │   └── payment.js     ← Stripe test payout
│   ├── .env               ← Your API keys (not committed)
│   └── .env.example       ← Key names + where to get them
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── ClaimForm.jsx
        │   └── ClaimResult.jsx
        └── services/api.js
```

## Setup

### 1. Get API Keys

| Service | Where to Get | Required? |
|---------|-------------|-----------|
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | **Yes** |
| **Stripe** (test key) | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) | Optional |
| **HDX/HAPI** identifier | [hapi.humdata.org](https://hapi.humdata.org/docs/) | Optional |
| **GDACS** | Public API, no key needed | — |
| **GDELT** | Public API, no key needed | — |

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your GEMINI_API_KEY (and optionally STRIPE_SECRET_KEY)
```

### 3. Run Backend

```bash
cd backend
npm start
# or for auto-reload during development:
npm run dev
```

Server starts at `http://localhost:3001`

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Frontend starts at `http://localhost:5173`

## API Reference

### `POST /api/claims`

**Body:**
```json
{
  "name": "Ahmad Karim",
  "country": "Bangladesh",
  "disasterType": "flood",
  "incidentDate": "2026-02-15",
  "description": "My home was destroyed by flooding...",
  "amount": "500"
}
```

**Response:**
```json
{
  "claim": { ... },
  "verdict": {
    "decision": "APPROVED",
    "confidence": 87,
    "reasoning": "GDACS confirms a Red-alert flood event in Bangladesh...",
    "risk_flags": []
  },
  "payment": {
    "paymentIntentId": "pi_...",
    "amount": 500,
    "currency": "USD",
    "status": "requires_payment_method"
  },
  "dataSources": {
    "gdacs": { ... },
    "hdx": { ... },
    "gdelt": { ... }
  }
}
```

## Testing the Demo

**Should be APPROVED:** Flood in Bangladesh, dated within the last 30 days  
**Should be REJECTED:** Earthquake in Switzerland (low disaster risk, no GDACS events)

## Notes

- Stripe is in **test mode** — no real money is transferred
- GDELT is treated as an optional source; failures are non-fatal
- Claims are stateless — no database, no user accounts
- Maximum payout capped at $10,000 per claim
