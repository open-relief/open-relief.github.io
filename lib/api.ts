// Typed API client – uses NEXT_PUBLIC_API_URL (e.g. https://api.example.com) or /api proxy

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
  requestsByStatus: {
    open: number;
    approved: number;
    rejected: number;
    funded: number;
  };
  donationTransfersTotal: number;
  donationTransfersCompleted: number;
  adminPayoutTransfersTotal: number;
  adminPayoutTransfersCompleted: number;
  adminPayoutTransfersPendingSettlement: number;
  adminPayoutTransfersFailed: number;
}

export interface AdminUser {
  email: string;
}

export interface RecipientUser {
  email: string;
  pointer: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
}

// ─── Shared helper ───────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://10.197.214.67:3001/api";

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body?.error ?? `HTTP ${res.status}` };
    }
    const data: T = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export const adminLogin = (email: string, password: string) =>
  api<{ ok: boolean; user: AdminUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const adminMe = () =>
  api<{ authenticated: boolean; user: AdminUser | null }>("/auth/me");

export const adminLogout = () =>
  api<{ ok: boolean }>("/auth/logout", { method: "POST" });

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminOverview = () =>
  api<AdminOverview>("/admin/overview");

export const getAdminRequests = () =>
  api<FundRequest[]>("/admin/requests");

export const patchAdminRequest = (
  id: string,
  body: { status?: string; adminNote?: string }
) =>
  api<{
    request: FundRequest;
    autoPayoutTriggered?: boolean;
    redirectUrl?: string;
  }>(`/admin/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const runAdminAgent = (requestId?: string) =>
  api<{ processed: number }>("/admin/agent/run", {
    method: "POST",
    body: JSON.stringify(requestId ? { requestId } : {}),
  });

// ─── Users / Recipients ───────────────────────────────────────────────────────

export const recipientSignup = (body: {
  email: string;
  password: string;
  pointer: string;
  keyId: string;
  privateKey: string;
  householdSize: number;
  perCapitaIncomeSgd: number;
}) => api<{ ok: boolean; user: RecipientUser }>("/users/signup", { method: "POST", body: JSON.stringify(body) });

export const recipientLogin = (email: string, password: string) =>
  api<{ ok: boolean; user: RecipientUser }>("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const recipientMe = () =>
  api<{ authenticated: boolean; user: RecipientUser | null }>("/users/me");

export const recipientLogout = () =>
  api<{ ok: boolean }>("/users/logout", { method: "POST" });

// ─── Fund Requests ────────────────────────────────────────────────────────────

export const createRequest = (body: {
  requesterName: string;
  amount: string;
  note: string;
  country?: string;
  disasterType?: string;
  incidentDate?: string;
  description?: string;
}) =>
  api<{ request: FundRequest }>("/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getRequests = (status?: string) =>
  api<FundRequest[]>(`/requests${status ? `?status=${status}` : ""}`);

// ─── Donations ────────────────────────────────────────────────────────────────

export const initDonation = (body: {
  donorWalletAddress: string;
  amount: number;
  keyId: string;
  privateKeyPath: string;
  requestId?: string;
}) =>
  api<{ transferId: string; redirectUrl: string }>("/donations/init", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Public Metrics ───────────────────────────────────────────────────────────

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

export const getPublicMetrics = () => api<PublicMetrics>("/metrics");

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
export const getAdminUsers = () => api<AdminUser[]>("/admin/users");
