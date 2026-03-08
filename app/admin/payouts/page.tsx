"use client";

import { useEffect, useState } from "react";
import { getAdminRequests, patchAdminRequest, type FundRequest } from "@/lib/api";

const statusColor: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  funded: "bg-green-100 text-green-800",
};

export default function AdminPayouts() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await getAdminRequests();
    if (data) setRequests(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function doAction(id: string, status: string) {
    setBusy(id);
    const { data, error } = await patchAdminRequest(id, {
      status,
      adminNote: actionNote[id] ?? "",
    });
    setBusy(null);
    if (error) {
      setToast(`Error: ${error}`);
    } else {
      setToast(`Request ${status}.`);
      load();
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Payout Requests</h1>
        <p className="text-base text-slate-500 mt-1">
          Review and approve aid payout requests from recipients
        </p>
      </div>

      {toast && (
        <p className="mb-4 text-sm bg-blue-50 text-blue-700 rounded-lg px-4 py-2">{toast}</p>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "open", "approved", "funded", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-base font-medium capitalize transition-colors ${
              filter === f
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.requestId} className="bg-white rounded-xl shadow-sm p-7">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-slate-800">{r.requesterName}</h3>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.status}
                  </span>
                  {r.autoReviewStatus !== "pending" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.autoReviewStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                      auto: {r.autoReviewStatus}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-1">{r.requesterEmail}</p>
                <p className="text-base text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 mb-2">
                  {r.note}
                </p>
                <div className="flex gap-4 text-sm text-slate-500">
                  <span>Household: {r.householdSize}</span>
                  <span>Per-capita income: S${r.perCapitaIncomeSgd}</span>
                  <span>Submitted: {new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.autoReviewReason && (
                  <p className="text-xs text-slate-400 mt-1 italic">Auto-reason: {r.autoReviewReason}</p>
                )}
                {r.adminNote && (
                  <p className="text-xs text-slate-500 mt-1">Admin note: {r.adminNote}</p>
                )}
                {r.payoutError && (
                  <p className="text-xs text-red-500 mt-1">Payout error: {r.payoutError}</p>
                )}

                {/* Admin note input */}
                {(r.status === "open") && (
                  <textarea
                    rows={2}
                    placeholder="Optional admin note…"
                    value={actionNote[r.requestId] ?? ""}
                    onChange={(e) => setActionNote((prev) => ({ ...prev, [r.requestId]: e.target.value }))}
                    className="mt-3 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                  />
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-slate-800">
                  S${Number(r.amount).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  {r.requesterWalletAddress
                    ? r.requesterWalletAddress.replace("https://", "")
                    : "—"}
                </p>

                {r.status === "open" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => doAction(r.requestId, "approved")}
                      disabled={busy === r.requestId}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {busy === r.requestId ? "…" : "Approve & Payout"}
                    </button>
                    <button
                      onClick={() => doAction(r.requestId, "rejected")}
                      disabled={busy === r.requestId}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {r.status === "approved" && r.payoutRedirectUrl && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse inline-block" />
                    <span className="text-sm font-medium">Wallet consent opened automatically</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No {filter === "all" ? "" : filter} requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

