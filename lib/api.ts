// ─── Fully client-side (localStorage) API – no backend required ──────────────
// All data is persisted in localStorage under "or_*" keys.
// Works as a static GitHub Pages export with zero server.
//
// Real Interledger payouts are bridged to the backend via NEXT_PUBLIC_BACKEND_URL.

// ─── Storage helpers ──────────────────────────────────────────────────────────

const ADMIN_EMAIL    = "admin@openrelief.org";
const ADMIN_PASSWORD = "openrelief-admin";
const BACKEND_URL    = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "");

function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}
function ok<T>(data: T): { data: T; error: null } { return { data, error: null }; }
function fail<T>(msg: string): { data: T | null; error: string } { return { data: null, error: msg }; }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FundRequest {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  requesterWalletAddress: string;
  amount: string;
  note: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
  status: "open" | "approved" | "rejected" | "funded";
  createdAt: string;
  updatedAt: string;
  fundedAt: string | null;
  autoReviewStatus: "pending" | "approved" | "rejected";
  autoReviewReason: string;
  adminNote: string;
  payoutStatus: string | null;
  payoutError: string;
  payoutRedirectUrl: string | null;
}

export interface AdminOverview {
  requestsTotal: number;
  requestsByStatus: { open: number; approved: number; rejected: number; funded: number };
  donationTransfersTotal: number;
  donationTransfersCompleted: number;
  adminPayoutTransfersTotal: number;
  adminPayoutTransfersCompleted: number;
  adminPayoutTransfersPendingSettlement: number;
  adminPayoutTransfersFailed: number;
}

export interface AdminUser {
  userId: string;
  email: string;
  pointer: string;
  keyId: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientUser {
  email: string;
  pointer: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
}

export interface PublicMetrics {
  totalUsers: number;
  totalRequests: number;
  requestsByStatus: { open: number; approved: number; funded: number; rejected: number };
  totalAmountRequested: number;
  totalAmountFunded: number;
  totalDonations: number;
  donationsByStatus: { completed: number; pendingConsent: number; pendingSettlement: number; failed: number };
  totalAmountDonated: number;
  donationAssetCode: string | null;
  donationAssetScale: number;
  autoApprovedCount: number;
}

// ─── Internal stored types ────────────────────────────────────────────────────

interface StoredRecipient {
  userId: string;
  email: string;
  passwordHash: string;
  pointer: string;
  keyId: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
  createdAt: string;
  updatedAt: string;
}

function getRecipients(): StoredRecipient[] { return ls<StoredRecipient[]>("or_recipients", []); }
function saveRecipients(r: StoredRecipient[]) { lsSet("or_recipients", r); }
function getRequests_(): FundRequest[] { return ls<FundRequest[]>("or_requests", []); }
function saveRequests(r: FundRequest[]) { lsSet("or_requests", r); }

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export interface PayoutResult {
  requiresConsent: boolean;
  redirectUrl: string | null;
  transferId: string;
  status: string;
}

export async function adminLogin(email: string, password: string) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    lsSet("or_admin_session", { email, at: Date.now() });
    // Store credentials for Basic auth on payout requests (session-independent)
    lsSet("or_admin_creds", { email, password });
    // Also establish a real backend session so Fund button can call /api/admin/payout/initiate.
    fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    }).catch(() => { /* backend offline – localStorage auth still works */ });
    return ok({ ok: true, user: { email } });
  }
  return fail<{ ok: boolean; user: { email: string } }>("Invalid email or password");
}

/** Initiate a real Interledger payout from the platform wallet to the recipient.
 *  Requires the backend (port 3001) to be running with DONATION_RECIPIENT_* env set. */
export async function fundAdminRequest(
  requestId: string,
  recipientWalletAddress: string,
  amount: string,
): Promise<{ data: PayoutResult | null; error: string | null }> {
  try {
    // Build Basic auth header from stored credentials as a stateless fallback
    const creds = ls<{ email: string; password: string } | null>("or_admin_creds", null);
    const basicAuth = creds
      ? "Basic " + btoa(`${creds.email}:${creds.password}`)
      : "Basic " + btoa(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`);
    const res = await fetch(`${BACKEND_URL}/api/admin/payout/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": basicAuth },
      credentials: "include",
      body: JSON.stringify({ requestId, recipientWalletAddress, amount }),
    });
    const json = await res.json();
    if (!res.ok) return fail<PayoutResult>(json?.error ?? `HTTP ${res.status}`);
    return ok<PayoutResult>(json as PayoutResult);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail<PayoutResult>(`Backend unreachable: ${msg}`);
  }
}

export async function adminMe() {
  const session = ls<{ email: string; at: number } | null>("or_admin_session", null);
  if (session && Date.now() - session.at < 8 * 60 * 60 * 1000) {
    return ok({ authenticated: true, user: { email: session.email } });
  }
  return ok({ authenticated: false, user: null });
}

export async function adminLogout() {
  if (typeof window !== "undefined") localStorage.removeItem("or_admin_session");
  return ok({ ok: true });
}

// ─── Admin data ───────────────────────────────────────────────────────────────

export async function getAdminOverview() {
  const reqs = getRequests_();
  const byStatus = { open: 0, approved: 0, rejected: 0, funded: 0 };
  for (const r of reqs) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return ok<AdminOverview>({
    requestsTotal: reqs.length,
    requestsByStatus: byStatus,
    donationTransfersTotal: 0,
    donationTransfersCompleted: 0,
    adminPayoutTransfersTotal: byStatus.funded,
    adminPayoutTransfersCompleted: byStatus.funded,
    adminPayoutTransfersPendingSettlement: 0,
    adminPayoutTransfersFailed: 0,
  });
}

export async function getAdminRequests() {
  return ok<FundRequest[]>(getRequests_());
}

export async function patchAdminRequest(
  id: string,
  body: { status?: string; adminNote?: string }
) {
  const reqs = getRequests_();
  const idx = reqs.findIndex((r) => r.requestId === id);
  if (idx === -1) return fail<{ request: FundRequest }>("Request not found");
  const now = new Date().toISOString();
  reqs[idx] = {
    ...reqs[idx],
    ...(body.status ? { status: body.status as FundRequest["status"] } : {}),
    ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
    updatedAt: now,
    fundedAt: body.status === "funded" ? now : reqs[idx].fundedAt,
  };
  saveRequests(reqs);
  return ok({ request: reqs[idx] });
}

export async function runAdminAgent(requestId?: string) {
  const reqs = getRequests_();
  let processed = 0;
  const targets = requestId
    ? reqs.filter((r) => r.requestId === requestId)
    : reqs.filter((r) => r.status === "open");
  for (const r of targets) {
    const idx = reqs.findIndex((x) => x.requestId === r.requestId);
    const autoApproved = Number(r.amount) < 100000;
    reqs[idx] = {
      ...reqs[idx],
      autoReviewStatus: autoApproved ? "approved" : "rejected",
      autoReviewReason: autoApproved ? "Within auto-approval threshold" : "Amount exceeds limit",
      status: autoApproved ? "approved" : reqs[idx].status,
      updatedAt: new Date().toISOString(),
    };
    processed++;
  }
  saveRequests(reqs);
  return ok<{ processed: number }>({ processed });
}

export async function getAdminUsers() {
  return ok<AdminUser[]>(
    getRecipients().map((r) => ({
      userId: r.userId,
      email: r.email,
      pointer: r.pointer,
      keyId: r.keyId,
      householdSize: r.householdSize,
      perCapitaIncomeSgd: r.perCapitaIncomeSgd,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  );
}

// ─── Recipient Auth ───────────────────────────────────────────────────────────

export async function recipientSignup(body: {
  email: string;
  password: string;
  pointer: string;
  keyId: string;
  privateKey: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
}) {
  const recipients = getRecipients();
  if (recipients.find((r) => r.email === body.email))
    return fail<{ ok: boolean; user: RecipientUser }>("Email already registered");
  const now = new Date().toISOString();
  const newUser: StoredRecipient = {
    userId: uid(), email: body.email, passwordHash: body.password,
    pointer: body.pointer, keyId: body.keyId,
    householdSize: body.householdSize, perCapitaIncomeSgd: body.perCapitaIncomeSgd,
    createdAt: now, updatedAt: now,
  };
  saveRecipients([...recipients, newUser]);
  lsSet("or_recipient_session", { email: body.email, at: Date.now() });
  return ok({ ok: true, user: { email: body.email, pointer: body.pointer, householdSize: body.householdSize, perCapitaIncomeSgd: body.perCapitaIncomeSgd } });
}

export async function recipientLogin(email: string, password: string) {
  const user = getRecipients().find((r) => r.email === email && r.passwordHash === password);
  if (!user) return fail<{ ok: boolean; user: RecipientUser }>("Invalid email or password");
  lsSet("or_recipient_session", { email, at: Date.now() });
  return ok({ ok: true, user: { email: user.email, pointer: user.pointer, householdSize: user.householdSize, perCapitaIncomeSgd: user.perCapitaIncomeSgd } });
}

export async function recipientMe() {
  const session = ls<{ email: string; at: number } | null>("or_recipient_session", null);
  if (!session || Date.now() - session.at >= 8 * 60 * 60 * 1000)
    return ok({ authenticated: false, user: null });
  const user = getRecipients().find((r) => r.email === session.email);
  if (!user) return ok({ authenticated: false, user: null });
  return ok({
    authenticated: true,
    user: { email: user.email, pointer: user.pointer, householdSize: user.householdSize, perCapitaIncomeSgd: user.perCapitaIncomeSgd },
  });
}

export async function recipientLogout() {
  if (typeof window !== "undefined") localStorage.removeItem("or_recipient_session");
  return ok({ ok: true });
}

// ─── Fund Requests ────────────────────────────────────────────────────────────

export async function createRequest(body: {
  requesterName: string;
  amount: string;
  note: string;
  country?: string;
  disasterType?: string;
  incidentDate?: string;
  description?: string;
}) {
  const session = ls<{ email: string } | null>("or_recipient_session", null);
  // Populate wallet address from the recipient's stored profile (pointer = Open Payments URL)
  const recipientProfile = session?.email
    ? getRecipients().find((r) => r.email === session.email)
    : null;
  const now = new Date().toISOString();
  const request: FundRequest = {
    requestId: uid(),
    requesterName: body.requesterName,
    requesterEmail: session?.email ?? "",
    requesterWalletAddress: recipientProfile?.pointer ?? "",
    amount: body.amount,
    note: body.note,
    householdSize: 0,
    perCapitaIncomeSgd: 0,
    status: "open",
    createdAt: now,
    updatedAt: now,
    fundedAt: null,
    autoReviewStatus: "pending",
    autoReviewReason: "",
    adminNote: "",
    payoutStatus: null,
    payoutError: "",
    payoutRedirectUrl: null,
  };
  saveRequests([...getRequests_(), request]);
  return ok({ request });
}

export async function getRequests(status?: string) {
  const reqs = getRequests_();
  return ok<FundRequest[]>(status ? reqs.filter((r) => r.status === status) : reqs);
}

// ─── Donations ────────────────────────────────────────────────────────────────

export async function initDonation(body: {
  donorWalletAddress: string;
  amount: number;
  keyId: string;
  privateKey: string;
  requestId?: string;
}): Promise<{ data: { transferId: string; redirectUrl: string } | null; error: string | null }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/donations/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorWalletAddress: body.donorWalletAddress,
        amount: body.amount,
        keyId: body.keyId,
        privateKeyPath: body.privateKey,   // backend accepts inline key text
        requestId: body.requestId ?? null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return fail(json?.error ?? "Donation init failed");
    return ok({ transferId: json.transferId, redirectUrl: json.redirectUrl });
  } catch (e) {
    return fail(String(e));
  }
}

// ─── Public Metrics ───────────────────────────────────────────────────────────

export async function getPublicMetrics() {
  const reqs = getRequests_();
  const users = getRecipients();
  const byStatus = { open: 0, approved: 0, funded: 0, rejected: 0 };
  let totalRequested = 0, totalFunded = 0;
  for (const r of reqs) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    totalRequested += Number(r.amount);
    if (r.status === "funded") totalFunded += Number(r.amount);
  }
  return ok<PublicMetrics>({
    totalUsers: users.length,
    totalRequests: reqs.length,
    requestsByStatus: byStatus,
    totalAmountRequested: totalRequested,
    totalAmountFunded: totalFunded,
    totalDonations: 0,
    donationsByStatus: { completed: 0, pendingConsent: 0, pendingSettlement: 0, failed: 0 },
    totalAmountDonated: 0,
    donationAssetCode: "USD",
    donationAssetScale: 2,
    autoApprovedCount: reqs.filter((r) => r.autoReviewStatus === "approved").length,
  });
}
