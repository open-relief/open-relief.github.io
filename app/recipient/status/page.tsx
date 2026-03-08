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

const statusMessage: Record<string, string> = {
  open:     "Your request is under review. We'll notify you within 24 hours.",
  approved: "Great news! Your request has been approved. Payout will be processed shortly.",
  rejected: "Unfortunately your request was not approved. You may submit a new one.",
  funded:   "Payment has been sent to your registered wallet address.",
};

const timelineSteps = ["Submitted", "Under Review", "Approved", "Funded"];
const reachedSteps: Record<string, string[]> = {
  open:     ["Submitted", "Under Review"],
  approved: ["Submitted", "Under Review", "Approved"],
  rejected: ["Submitted", "Under Review"],
  funded:   ["Submitted", "Under Review", "Approved", "Funded"],
};

export default function MyApplications() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, allRes] = await Promise.all([recipientMe(), getRequests()]);
      const email = meRes.data?.user?.email;
      if (allRes.data) {
        const mine = email ? allRes.data.filter(r => r.requesterEmail === email) : allRes.data;
        setRequests(mine);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-2"><div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Applications</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Track the status of all your aid requests</p>
        </div>
        <Link
          href="/recipient/apply"
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#10b981", color: "#000" }}
        >
          + New Application
        </Link>
      </div>

      <div className="space-y-5">
        {requests.map(r => {
          const s = statusStyle[r.status];
          const steps = reachedSteps[r.status] ?? ["Submitted"];
          return (
            <div
              key={r.requestId}
              className="glass p-6 animate-fade-in"
              style={s ? { borderColor: s.border } : {}}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{r.requesterName}</h3>
                  <p className="text-sm mt-0.5 max-w-lg" style={{ color: "#94a3b8" }}>{r.note}</p>
                  <p className="text-xs mt-1" style={{ color: "#475569" }}>
                    Submitted {new Date(r.createdAt).toLocaleDateString()}
                    {r.fundedAt && ` · Funded ${new Date(r.fundedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold text-white">S${Number(r.amount).toLocaleString()}</p>
                  {s && (
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize mt-2"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    >
                      {r.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Status message */}
              {s && (
                <div
                  className="p-3 rounded-lg text-sm mb-5"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                >
                  {statusMessage[r.status]}
                </div>
              )}

              {r.adminNote && (
                <p className="text-xs italic mb-4" style={{ color: "#64748b" }}>Admin note: {r.adminNote}</p>
              )}

              {/* Timeline */}
              <div className="flex items-center">
                {timelineSteps.map((step, i, arr) => {
                  const reached = steps.includes(step);
                  const isRejected = r.status === "rejected" && step === "Approved";
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={isRejected ? {
                            background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)"
                          } : reached ? {
                            background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)"
                          } : {
                            background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)"
                          }}
                        >
                          {isRejected ? "✗" : reached ? "✓" : i + 1}
                        </div>
                        <p
                          className="text-xs mt-1.5 text-center whitespace-nowrap"
                          style={{ color: reached ? "#94a3b8" : "#334155", fontWeight: reached ? 500 : 400 }}
                        >
                          {step}
                        </p>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className="flex-1 h-px mb-5"
                          style={{ background: (steps.includes(arr[i + 1]) && r.status !== "rejected") ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.07)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="py-20 text-center" style={{ color: "#475569" }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="mb-4">No applications yet.</p>
            <Link href="/recipient/apply" className="text-sm font-medium" style={{ color: "#34d399" }}>
              Apply for aid →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
