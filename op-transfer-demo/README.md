# Open Payments Community Portal Demo

A simple localhost multi-page website powered by Open Payments.

Pages included:

1. `donations.html` - donors send funds to a configured recipient account.
2. `admin.html` - admins review/update fund requests; setting status to `approved` auto-pays from the configured Shawn account.
3. `request.html` - signed-in users create fund requests linked to their profile pointer.
4. `login.html` - admin email/password sign-in page.
5. `user-auth.html` - user signup/login page with recipient profile fields.

Comprehensive technical documentation:

- `docs/COMPREHENSIVE-TRANSFER-GUIDE.md`

## Prerequisites

- Node.js 20+
- Open Payments-enabled wallet(s)
- Donor key material (for donation flow)

For testing, you can use the Interledger test wallet: `https://wallet.interledger-test.dev`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill in values:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

3. Start the server:

```bash
npm start
```

4. Open `http://localhost:3000`.

## Page Routes

- `http://localhost:3000/` - home page
- `http://localhost:3000/donations.html` - donations page
- `http://localhost:3000/request.html` - request page
- `http://localhost:3000/admin.html` - admin page
- `http://localhost:3000/login.html` - admin login page
- `http://localhost:3000/user-auth.html` - user signup/login page

## Configuration

The donations page uses a backend-configured recipient account:

- `DONATION_RECIPIENT_KEY_ID`
- `DONATION_RECIPIENT_PRIVATE_KEY_PATH`
- `DONATION_RECIPIENT_WALLET_ADDRESS`

The app currently uses your provided values in `.env`.

Donor credentials can be supplied:

- In `.env` (`KEY_ID`, `PRIVATE_KEY_PATH`), or
- In the donations page form per donation.

Private key input supports:

- File path
- Raw PEM text
- Raw base64 PKCS8 text
- `PRIV...` format

User signup profile fields:

- `email`
- `password`
- `pointer` (wallet URL)
- `keyId`
- `privateKey`
- `householdSize`
- `perCapitaIncomeSgd`

Data persistence:

- User accounts and requests are persisted in `data/app-data.json`.

## API Endpoints

- `GET /api/health`
- `GET /api/config`
- `GET /api/wallet-info?url={walletAddress}`
- `POST /api/donations/init`
- `GET /api/donations/callback`
- `POST /api/requests`
- `GET /api/requests`
- `POST /api/users/signup`
- `POST /api/users/login`
- `GET /api/users/me`
- `POST /api/users/logout`
- `GET /api/admin/overview`
- `GET /api/admin/requests`
- `PATCH /api/admin/requests/:id`
- `POST /api/admin/agent/run`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Auto-approval agent behavior:

- Runs automatically for new/open requests and can also be triggered manually via `POST /api/admin/agent/run`.
- Auto-approves only when requested amount is `< AUTO_APPROVAL_MAX_UNITS` (default `100000`).
- Uses `householdSize` and `perCapitaIncomeSgd` to evaluate affordability for non-needy households.
- Marks household as needy when `householdSize >= 5` and `perCapitaIncomeSgd < 1300` (configurable).
- If needy, increases approved amount by `NEEDY_AMOUNT_BONUS_UNITS` (default `10000`), capped below auto-approval max.
- On approval, payout is triggered from Shawn wallet (same behavior as admin approval).

Admin approval behavior:

- Setting a request to `approved` triggers an automatic payout from the configured Shawn wallet to the requester's wallet.
- If Shawn's provider requires interactive consent, the admin is redirected to approve the payout and then returned to callback finalization.
- If settlement is delayed, the request remains `approved` with `payoutStatus: pending-settlement`.
- If payout completes immediately, the request is marked `funded`.

Admin auth:

- Session cookie set by `POST /api/auth/login`
- Configure credentials in `.env`:
	- `ADMIN_USER_EMAIL`
	- `ADMIN_USER_PASSWORD`

## Security Notes

- Private key is kept server-side only.
- Callback hash verification is implemented when a hash is provided.
- User private keys are stored in `data/app-data.json` for demo purposes.
- This is a demo and is not production hardened.
