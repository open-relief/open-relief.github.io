"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, type FundRequest } from "@/lib/api";

export default function DonorDashboard() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequests("open").then(({ data }) => {
      if (data) setRequests(data.slice(0, 3));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome to Open Relief 💛</h1>
        <p className="text-base text-slate-500 mt-1">Your generosity makes a real difference.</p>
      </div>

      {/* Active fund requests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-slate-800">Open Fund Requests — Donate Now</h2>
          <Link href="/donor/campaigns" className="text-sm text-amber-600 hover:underline">
            See all →
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : requests.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {requests.map((r) => (
              <div key={r.requestId} className="bg-white rounded-xl shadow-sm p-7 border border-slate-100 hover:border-amber-300 transition-colors flex flex-col">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{r.requesterName}</h3>
                <p className="text-base text-slate-500 mb-4 line-clamp-3 flex-1">{r.note}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xl font-bold text-amber-600">
                    S${Number(r.amount).toLocaleString()}
                  </span>
                  <Link
                    href={`/donor/donate?id=${r.requestId}`}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Donate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 bg-white rounded-xl shadow-sm">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No open fund requests at the moment</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-7 text-center">
        <p className="text-lg font-semibold text-slate-800 mb-1">Browse all fund requests</p>
        <p className="text-base text-slate-500 mb-5">See open, approved, and funded requests</p>
        <Link
          href="/donor/campaigns"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          View All Requests →
        </Link>
      </div>
    </div>
  );
}

