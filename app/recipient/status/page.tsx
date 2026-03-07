"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, recipientMe, type FundRequest } from "@/lib/api";

const statusColor: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  funded: "bg-green-100 text-green-800 border-green-200",
};

const statusIcon: Record<string, string> = {
  open: "⏳",
  approved: "✅",
  rejected: "❌",
  funded: "💰",
};

const statusMessage: Record<string, string> = {
  open: "Your request is under review. We'll notify you within 24 hours.",
  approved: "Great news! Your request has been approved. Payout will be processed shortly.",
  rejected: "Unfortunately your request was not approved. You may submit a new one.",
  funded: "Payment has been sent to your registered wallet address.",
};

const timelineSteps = ["submitted", "under review", "approved", "funded"];
const reachedSteps: Record<string, string[]> = {
  open: ["submitted", "under review"],
  approved: ["submitted", "under review", "approved"],
  rejected: ["submitted", "under review", "rejected"],
  funded: ["submitted", "under review", "approved", "funded"],
};

export default function MyApplications() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // get current user email then filter requests
      const [meRes, allRes] = await Promise.all([recipientMe(), getRequests()]);
      const email = meRes.data?.user?.email;
      if (allRes.data) {
        const mine = email
          ? allRes.data.filter((r) => r.requesterEmail === email)
          : allRes.data;
        setRequests(mine);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Applications</h1>
          <p className="text-base text-slate-500 mt-1">Track the status of all your aid requests</p>
        </div>
        <Link
          href="/recipient/apply"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + New Application
        </Link>
      </div>

      <div className="space-y-6">
        {requests.map((r) => {
          const steps = reachedSteps[r.status] ?? ["submitted"];
          const colorClass = statusColor[r.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
          return (
            <div key={r.requestId} className={`bg-white rounded-xl shadow-sm border p-7 ${colorClass.split(" ")[2]}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{r.requesterName}</h3>
                  <p className="text-base text-slate-500 mt-0.5 line-clamp-2 max-w-lg">{r.note}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Submitted: {new Date(r.createdAt).toLocaleDateString()}
                    {r.fundedAt && ` · Funded: ${new Date(r.fundedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold text-slate-800">S${Number(r.amount).toLocaleString()}</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-semibold border mt-2 ${colorClass}`}>
                    {statusIcon[r.status] ?? "•"} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Status message */}
              <div className={`p-3 rounded-lg text-sm mb-4 ${colorClass}`}>
                {statusMessage[r.status] ?? "Status unknown."}
              </div>

              {r.adminNote && (
                <p className="text-xs text-slate-500 italic mb-3">Admin note: {r.adminNote}</p>
              )}

              {/* Timeline */}
              <div className="flex items-center gap-0">
                {timelineSteps.map((step, i, arr) => {
                  const reached = steps.includes(step);
                  const isRejectedStep = r.status === "rejected" && step === "approved";
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isRejectedStep
                              ? "bg-red-200 text-red-700"
                              : reached
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {isRejectedStep ? "✗" : reached ? "✓" : i + 1}
                        </div>
                        <p className={`text-xs mt-1 capitalize whitespace-nowrap ${reached ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                          {step}
                        </p>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${steps.includes(arr[i + 1]) && r.status !== "rejected" ? "bg-emerald-400" : "bg-slate-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="mb-4">No applications yet.</p>
            <Link href="/recipient/apply" className="text-emerald-600 hover:underline text-sm font-medium">
              Apply for aid →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

