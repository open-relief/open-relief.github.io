"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminOverview, getAdminRequests, runAdminAgent, type AdminOverview, type FundRequest } from "@/lib/api";

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  funded: "bg-green-100 text-green-800",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-4xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [ov, reqs] = await Promise.all([getAdminOverview(), getAdminRequests()]);
    if (ov.data) setOverview(ov.data);
    if (reqs.data) setRequests(reqs.data.slice(0, 5));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleRunAgent() {
    setAgentRunning(true);
    setAgentMsg(null);
    const { data, error } = await runAdminAgent();
    setAgentRunning(false);
    if (error) {
      setAgentMsg(`Error: ${error}`);
    } else {
      setAgentMsg(`Agent processed ${data?.processed ?? 0} request(s).`);
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-base text-slate-500 mt-1">Overview of Open Relief platform operations</p>
        </div>
        <button
          onClick={handleRunAgent}
          disabled={agentRunning}
          className="bg-amber-500 hover:bg-amber-600 text-white text-base font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition"
        >
          {agentRunning ? "Running agent…" : "Run Auto-Approval Agent"}
        </button>
      </div>

      {agentMsg && (
        <p className="mb-6 text-sm bg-blue-50 text-blue-700 rounded-lg px-4 py-2">{agentMsg}</p>
      )}

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Requests" value={overview.requestsTotal} />
          <StatCard label="Open" value={overview.requestsByStatus.open} />
          <StatCard label="Approved" value={overview.requestsByStatus.approved} />
          <StatCard label="Funded" value={overview.requestsByStatus.funded} />
        </div>
      )}

      {/* Payout transfer stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Payouts Initiated" value={overview.adminPayoutTransfersTotal} />
          <StatCard label="Payouts Completed" value={overview.adminPayoutTransfersCompleted} />
          <StatCard label="Payouts Pending" value={overview.adminPayoutTransfersPendingSettlement} />
          <StatCard label="Payouts Failed" value={overview.adminPayoutTransfersFailed} />
        </div>
      )}

      {/* Recent requests table */}
      <div className="bg-white rounded-xl shadow-sm p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">Recent Fund Requests</h2>
          <Link href="/admin/payouts" className="text-sm text-amber-600 hover:underline">
            View all →
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.requestId} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-base font-medium text-slate-800">{r.requesterName}</p>
                  <p className="text-sm text-slate-500 truncate max-w-xs">{r.note}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-base font-semibold text-slate-800">
                    S${Number(r.amount).toLocaleString()}
                  </p>
                  <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <p className="text-3xl mb-2">—</p>
            <p className="text-sm">No fund requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

