"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, type AdminUser } from "@/lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAdminUsers().then(({ data }) => {
      if (data) setUsers(data);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.pointer.toLowerCase().includes(search.toLowerCase())
  );

  const avgHousehold = users.length
    ? (users.reduce((s, u) => s + u.householdSize, 0) / users.length).toFixed(1)
    : "—";
  const avgIncome = users.length
    ? `S$${(users.reduce((s, u) => s + u.perCapitaIncomeSgd, 0) / users.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "—";

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Recipients</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>All registered aid recipients on the platform</p>
        </div>
        <input
          type="search"
          placeholder="Search email or wallet…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="inp"
          style={{ width: 260 }}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Recipients",     value: users.length,  accent: "#f59e0b" },
          { label: "Avg Household Size",   value: avgHousehold,  accent: "#8b5cf6" },
          { label: "Avg Per-Capita Income",value: avgIncome,     accent: "#10b981" },
        ].map(s => (
          <div key={s.label} className="glass p-5 text-center">
            <p className="text-3xl font-bold mb-1" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#64748b" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="flex justify-center gap-2">
              <div className="checking-dot" /><div className="checking-dot" /><div className="checking-dot" />
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Email", "Wallet Pointer", "Household", "Per-Capita Income", "Joined"].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "#475569" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.userId}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                      >
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4" style={{ color: "#64748b", maxWidth: 200 }}>
                    <a href={u.pointer} target="_blank" rel="noreferrer"
                      className="text-xs font-mono hover:text-white transition-colors truncate block max-w-[180px]">
                      {u.pointer.replace("https://", "")}
                    </a>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: "#94a3b8" }}>{u.householdSize}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: "#94a3b8" }}>S${u.perCapitaIncomeSgd.toLocaleString()}</td>
                  <td className="px-5 py-4 text-xs" style={{ color: "#64748b" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center" style={{ color: "#475569" }}>
                    <p className="text-3xl mb-3">◉</p>
                    <p className="text-sm">No recipients found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
