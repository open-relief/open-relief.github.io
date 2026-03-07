"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, recipientMe, type FundRequest } from "@/lib/api";

const statusColor: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  funded: "bg-green-100 text-green-800",
};

const statusIcon: Record<string, string> = {
  open: "⏳",
  approved: "✅",
  rejected: "❌",
  funded: "💰",
};

export default function RecipientDashboard() {
  const [myRequests, setMyRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, allRes] = await Promise.all([recipientMe(), getRequests()]);
      const email = meRes.data?.user?.email;
      if (allRes.data) {
        const mine = email
          ? allRes.data.filter((r) => r.requesterEmail === email)
          : [];
        setMyRequests(mine.slice(0, 3));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome 👋</h1>
        <p className="text-base text-slate-500 mt-1">
          You are signed in as a recipient. Apply for aid or track your existing requests below.
        </p>
      </div>

      {/* Application status */}
      <div className="bg-white rounded-xl shadow-sm p-7 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">My Applications</h2>
          <Link href="/recipient/status" className="text-sm text-emerald-600 hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : myRequests.length > 0 ? (
          <div className="space-y-3">
            {myRequests.map((r) => (
              <div key={r.requestId} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-medium text-slate-800">{r.requesterName}</p>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1 max-w-xs">{r.note}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-800">S${Number(r.amount).toLocaleString()}</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium mt-1 ${statusColor[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                    {statusIcon[r.status] ?? "•"} {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No applications yet.</p>
          </div>
        )}
      </div>

      {/* Apply CTA */}
      <div className="bg-emerald-700 rounded-xl p-7 text-white">
        <h2 className="font-semibold text-xl mb-1">Need financial relief?</h2>
        <p className="text-emerald-200 text-base mb-5">
          Submit a fund request and our team will review it immediately. Payouts are sent
          directly to your registered wallet.
        </p>
        <Link
          href="/recipient/apply"
          className="inline-block bg-white text-emerald-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-50 transition-colors"
        >
          Apply for Aid →
        </Link>
      </div>
    </div>
  );
}

