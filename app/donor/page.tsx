"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicMetrics, getRequests, type PublicMetrics, type FundRequest } from "@/lib/api";

function fmt(n: number) {
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `S$${(n / 1_000).toFixed(0)}K`;
  return `S$${n.toLocaleString()}`;
}

export default function DonorDashboard() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [openRequests, setOpenRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPublicMetrics(), getRequests()]).then(([m, r]) => {
      if (m.data) setMetrics(m.data);
      if (r.data) setOpenRequests(r.data.filter(x => x.status === "open").slice(0, 4));
      setLoading(false);
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Donor Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Make a direct impact — fund verified disaster relief requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {loading || !metrics
          ? [0,1,2].map(i => <div key={i} className="glass p-6 animate-pulse"><div className="h-8 bg-white/10 rounded mb-2 w-16" /><div className="h-4 bg-white/5 rounded w-24" /></div>)
          : [
              { label: "Aid Requests", value: metrics.totalRequests.toString(), accent: "#8b5cf6" },
              { label: "Total Requested", value: fmt(metrics.totalAmountRequested), accent: "#f59e0b" },
              { label: "Total Funded", value: fmt(metrics.totalAmountFunded), accent: "#10b981" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="glass p-6" style={{ borderColor: `${accent}30` }}>
                <p className="text-3xl font-bold mb-1" style={{ color: accent }}>{value}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
              </div>
            ))}
      </div>

      {/* Open requests */}
      <div className="glass p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Open Fund Requests</h2>
          <Link href="/donor/campaigns" className="text-xs font-medium" style={{ color: "#a78bfa" }}>View all →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : openRequests.length > 0 ? (
          <div className="space-y-2">
            {openRequests.map(r => (
              <div key={r.requestId}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{r.requesterName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-white">S${(Number(r.amount)/100).toFixed(2)}</p>
                  <Link
                    href={`/donor/donate?requestId=${r.requestId}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
                  >
                    Donate →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center" style={{ color: "#475569" }}>
            <p className="text-3xl mb-2">—</p>
            <p className="text-sm">No open requests.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-7"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%)", border: "1px solid rgba(139,92,246,0.2)" }}
      >
        <h2 className="font-bold text-lg text-white mb-1">Browse all campaigns</h2>
        <p className="text-sm mb-5" style={{ color: "#94a3b8" }}>
          See all verified disaster relief requests and choose who to support.
        </p>
        <Link href="/donor/campaigns"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#8b5cf6", color: "#fff" }}>
          Browse Campaigns →
        </Link>
      </div>
    </div>
  );
}
