"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRequests, type FundRequest } from "@/lib/api";

export default function CampaignsPage() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "approved">("all");

  useEffect(() => {
    getRequests().then(({ data }) => {
      if (data) setRequests(data.filter(r => r.status === "open" || r.status === "approved"));
      setLoading(false);
    });
  }, []);

  const filtered = requests
    .filter(r => filter === "all" || r.status === filter)
    .filter(r =>
      r.requesterName.toLowerCase().includes(search.toLowerCase()) ||
      r.note.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Active Campaigns</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Verified disaster relief requests — donate directly to recipients.</p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="search"
          placeholder="Search name or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="inp inp-violet"
          style={{ width: 280, background: "var(--bg2)" }}
        />
        <div className="flex gap-2 flex-wrap">
          {(["all", "open", "approved"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
              style={filter === t ? {
                background: "#8b5cf6", color: "#fff",
              } : {
                background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <div key={i} className="glass p-6 animate-pulse h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass py-20 text-center" style={{ color: "#475569" }}>
          <p className="text-3xl mb-3">🌍</p>
          <p>No campaigns match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div
              key={r.requestId}
              className="glass glass-hover p-6 flex flex-col group transition-all hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
                >
                  🌍
                </div>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize"
                  style={r.status === "open"
                    ? { background: "rgba(234,179,8,0.12)", color: "#fde047", border: "1px solid rgba(234,179,8,0.3)" }
                    : { background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  {r.status}
                </span>
              </div>

              <h3 className="font-semibold text-white mb-1">{r.requesterName}</h3>
              <p className="text-xs mb-2" style={{ color: "#64748b" }}>
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm leading-relaxed line-clamp-2 flex-1 mb-4" style={{ color: "#94a3b8" }}>{r.note}</p>

              <div className="flex items-center justify-between mt-auto">
                <p className="text-lg font-bold text-white">S${Number(r.amount).toLocaleString()}</p>
                <Link
                  href={`/donor/donate?requestId=${r.requestId}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                  style={{ background: "#8b5cf6", color: "#fff" }}
                >
                  Donate →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
