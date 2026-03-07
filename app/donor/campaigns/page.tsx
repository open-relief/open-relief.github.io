"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, type FundRequest } from "@/lib/api";

export default function DonorCampaigns() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getRequests().then(({ data }) => {
      if (data) setRequests(data);
      setLoading(false);
    });
  }, []);

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

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
        <h1 className="text-3xl font-bold text-slate-800">Fund Requests</h1>
        <p className="text-base text-slate-500 mt-1">
          Support individuals affected by disasters. Every dollar goes directly to those in need.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "open", "approved", "funded"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-base font-medium capitalize transition-colors ${
              filter === f
                ? "bg-amber-500 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((r) => (
          <div
            key={r.requestId}
            className={`bg-white rounded-xl shadow-sm border p-7 transition-all ${
              r.status === "open" || r.status === "approved"
                ? "border-slate-100 hover:border-amber-300 hover:shadow-md"
                : "border-slate-100 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{r.requesterName}</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Submitted {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  r.status === "open"
                    ? "bg-yellow-100 text-yellow-700"
                    : r.status === "approved"
                    ? "bg-blue-100 text-blue-700"
                    : r.status === "funded"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {r.status}
              </span>
            </div>

            <p className="text-base text-slate-600 mb-5 line-clamp-3">{r.note}</p>

            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-slate-800">
                S${Number(r.amount).toLocaleString()}
              </p>
              {(r.status === "open" || r.status === "approved") && (
                <Link
                  href={`/donor/donate?id=${r.requestId}`}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Donate →
                </Link>
              )}
              {r.status === "funded" && (
                <span className="text-sm text-green-600 font-medium">✓ Funded</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📭</p>
          <p>No {filter === "all" ? "" : filter} requests at the moment.</p>
        </div>
      )}
    </div>
  );
}
