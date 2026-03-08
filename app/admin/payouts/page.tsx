"use client";

import { useEffect, useState } from "react";
import { getAdminRequests, patchAdminRequest, fundAdminRequest, type FundRequest } from "@/lib/api";

const TABS = ["all", "open", "approved", "funded", "rejected"] as const;
type Tab = typeof TABS[number];

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  open:     { bg: "rgba(234,179,8,0.12)",  color: "#fde047", border: "rgba(234,179,8,0.3)"  },
  approved: { bg: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  rejected: { bg: "rgba(239,68,68,0.12)",  color: "#fca5a5", border: "rgba(239,68,68,0.3)"  },
  funded:   { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "rgba(16,185,129,0.3)" },
};

function Badge({ status }: { status: string }) {
  const s = statusStyle[status] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}

export default function AdminPayouts() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  // Consent flow: when ILP requires interactive grant, we show an overlay.
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [consentRequestId, setConsentRequestId] = useState<string | null>(null);

  function showToast(msg: string, isError = false) {
    setToast(msg); setToastError(isError);
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    const { data } = await getAdminRequests();
    if (data) setRequests(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = tab === "all" ? requests : requests.filter(r => r.status === tab);

  async function doAction(requestId: string, action: "approve" | "reject" | "fund", request?: FundRequest) {
    setActionLoading(requestId + action);
    if (action === "fund" && request) {
      const walletAddress = request.requesterWalletAddress?.trim();
      if (!walletAddress || !/^https?:\/\//i.test(walletAddress)) {
        showToast("Recipient has no wallet address — cannot send ILP payment", true);
        setActionLoading(null);
        return;
      }
      const { data, error } = await fundAdminRequest(requestId, walletAddress, request.amount);
      setActionLoading(null);
      if (error) {
        showToast(`Payout failed: ${error}`, true);
        return;
      }
      if (data!.requiresConsent && data!.redirectUrl) {
        // Interactive grant — admin must authorize in their Interledger wallet.
        setConsentUrl(data!.redirectUrl);
        setConsentRequestId(requestId);
        window.open(data!.redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        // Cached token — payment sent instantly.
        await patchAdminRequest(requestId, { status: "funded" });
        await load();
        showToast("Payment sent via Interledger ✓");
      }
    } else {
      await patchAdminRequest(requestId, { status: action === "approve" ? "approved" : "rejected" });
      showToast(action === "approve" ? "Request approved ✓" : "Request rejected");
      await load();
      setActionLoading(null);
    }
  }

  async function confirmConsentDone() {
    if (!consentRequestId) return;
    await patchAdminRequest(consentRequestId, { status: "funded" });
    await load();
    setConsentUrl(null);
    setConsentRequestId(null);
    showToast("Payment authorized and request marked as funded ✓");
  }

  const tabCount = (t: Tab) => t === "all" ? requests.length : requests.filter(r => r.status === t).length;

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium animate-slide-down"
          style={toastError
            ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }
            : { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}
        >
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Payout Requests</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Review and action all incoming aid applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
            style={tab === t ? {
              background: "#f59e0b",
              color: "#000",
            } : {
              background: "rgba(255,255,255,0.05)",
              color: "#64748b",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {t} ({tabCount(t)})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "#475569" }}>
            <div className="flex justify-center gap-2">
              <div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "#475569" }}>
            <p className="text-3xl mb-3">—</p>
            <p className="text-sm">No requests in this category</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {/* Header */}
            <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
              <div className="col-span-3">Applicant</div>
              <div className="col-span-3">Note</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.map((r) => (
              <div
                key={r.requestId}
                className="grid grid-cols-12 px-5 py-4 items-center transition-all"
                style={{ cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="col-span-3">
                  <p className="text-sm font-medium text-white">{r.requesterName}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#475569" }}>{r.requesterEmail}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs truncate max-w-[180px]" style={{ color: "#94a3b8" }}>{r.note}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-sm font-semibold text-white">S${Number(r.amount).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs" style={{ color: "#64748b" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="col-span-1">
                  <Badge status={r.status} />
                </div>
                <div className="col-span-2 flex gap-2 justify-end flex-wrap">
                  {r.status === "open" && (
                    <>
                      <button
                        onClick={() => doAction(r.requestId, "approve")}
                        disabled={!!actionLoading}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}
                      >
                        {actionLoading === r.requestId + "approve" ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => doAction(r.requestId, "reject")}
                        disabled={!!actionLoading}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}
                      >
                        {actionLoading === r.requestId + "reject" ? "…" : "Reject"}
                      </button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <button
                      onClick={() => doAction(r.requestId, "fund", r)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }}
                    >
                      {actionLoading === r.requestId + "fund" ? "Sending…" : "Fund →"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consent overlay — shown when ILP requires interactive authorization */}
      {consentUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(7,11,20,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div className="glass p-8 max-w-md w-full mx-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-5"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              🔐
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Authorization Required</h3>
            <p className="text-sm mb-2" style={{ color: "#94a3b8" }}>
              A new tab has opened asking you to authorize this payout in your Interledger wallet.
              Once you have approved it there, click the button below.
            </p>
            <p className="text-xs mb-6" style={{ color: "#475569" }}>
              If the tab didn&apos;t open,{" "}
              <a href={consentUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b" }}>click here</a>.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={confirmConsentDone}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "#f59e0b", color: "#000" }}
              >
                I&apos;ve Authorized — Mark as Funded
              </button>
              <button
                onClick={() => { setConsentUrl(null); setConsentRequestId(null); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
