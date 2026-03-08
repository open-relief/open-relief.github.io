"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminOverview, getAdminRequests, type AdminOverview, type FundRequest } from "@/lib/api";

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  open:     { bg: "rgba(234,179,8,0.12)",  color: "#fde047", border: "rgba(234,179,8,0.3)"  },
  approved: { bg: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  rejected: { bg: "rgba(239,68,68,0.12)",  color: "#fca5a5", border: "rgba(239,68,68,0.3)"  },
  funded:   { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "rgba(16,185,129,0.3)" },
};

function Badge({ status }: { status: string }) {
  const s = statusStyles[status] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recent, setRecent] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminOverview(), getAdminRequests()]).then(([ov, rq]) => {
      if (ov.data) setOverview(ov.data);
      if (rq.data) setRecent(rq.data.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const stats = overview
    ? [
        { label: "Total Requests",  value: overview.requestsTotal,                  accent: "#f59e0b" },
        { label: "Funded",          value: overview.requestsByStatus.funded,        accent: "#10b981" },
        { label: "Pending Review",  value: overview.requestsByStatus.open,          accent: "#f59e0b" },
        { label: "Rejected",        value: overview.requestsByStatus.rejected,      accent: "#ef4444" },
      ]
    : null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Real-time aid platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass animate-pulse p-6">
                <div className="h-8 rounded bg-white/10 mb-3 w-16" />
                <div className="h-4 rounded bg-white/5 w-24" />
              </div>
            ))
          : stats?.map(({ label, value, accent }) => (
              <div
                key={label}
                className="glass p-6 transition-all hover:scale-[1.02]"
                style={{ borderColor: `${accent}30` }}
              >
                <p className="text-3xl font-bold mb-1" style={{ color: accent }}>{value}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
              </div>
            ))}
      </div>

      {/* Recent requests */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Recent Fund Requests</h2>
          <Link
            href="/admin/payouts"
            className="text-xs font-medium transition-colors"
            style={{ color: "#f59e0b" }}
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.requestId}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{r.requesterName}</p>
                  <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: "#475569" }}>{r.note}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="text-sm font-semibold text-white">S${(Number(r.amount)/100).toFixed(2)}</p>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center" style={{ color: "#475569" }}>
            <p className="text-4xl mb-3">—</p>
            <p className="text-sm">No fund requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
