"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, recipientMe, type FundRequest } from "@/lib/api";

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  open:     { bg: "rgba(234,179,8,0.12)",  color: "#fde047", border: "rgba(234,179,8,0.3)"  },
  approved: { bg: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  rejected: { bg: "rgba(239,68,68,0.12)",  color: "#fca5a5", border: "rgba(239,68,68,0.3)"  },
  funded:   { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "rgba(16,185,129,0.3)" },
};

function Badge({ status }: { status: string }) {
  const s = statusStyle[status] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export default function RecipientDashboard() {
  const [myRequests, setMyRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, allRes] = await Promise.all([recipientMe(), getRequests()]);
      const email = meRes.data?.user?.email;
      if (allRes.data) {
        const mine = email ? allRes.data.filter(r => r.requesterEmail === email) : [];
        setMyRequests(mine.slice(0, 3));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome Back 👋</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Track your aid applications and apply for relief.</p>
      </div>

      {/* Recent applications */}
      <div className="glass p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">My Applications</h2>
          <Link href="/recipient/status" className="text-xs font-medium" style={{ color: "#34d399" }}>
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : myRequests.length > 0 ? (
          <div className="space-y-2">
            {myRequests.map(r => (
              <div key={r.requestId}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-sm font-medium text-white">{r.requesterName}</p>
                  <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: "#475569" }}>{r.note}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#334155" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="text-sm font-semibold text-white">S${(Number(r.amount)/100).toFixed(2)}</p>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center" style={{ color: "#475569" }}>
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No applications yet.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <h2 className="font-bold text-lg text-white mb-1">Need financial relief?</h2>
        <p className="text-sm mb-5" style={{ color: "#94a3b8" }}>
          Submit a fund request. Our Gemini AI agent cross-checks GDACS, World Bank & GDELT data to verify your claim instantly.
        </p>
        <Link
          href="/recipient/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#10b981", color: "#000" }}
        >
          Apply for Aid →
        </Link>
      </div>
    </div>
  );
}
