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

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.pointer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Recipients</h1>
          <p className="text-base text-slate-500 mt-1">All registered recipients on the platform</p>
        </div>
        <input
          type="search"
          placeholder="Search by email or wallet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 w-72"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Recipients", value: users.length },
          {
            label: "Avg Household Size",
            value: users.length
              ? (users.reduce((s, u) => s + u.householdSize, 0) / users.length).toFixed(1)
              : "—",
          },
          {
            label: "Avg Per-Capita Income",
            value: users.length
              ? `S$${(users.reduce((s, u) => s + u.perCapitaIncomeSgd, 0) / users.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-4xl font-bold text-slate-800">{s.value}</p>
            <p className="text-base text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400">Loading…</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left">
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Wallet Pointer</th>
                <th className="px-6 py-4 font-semibold">Household</th>
                <th className="px-6 py-4 font-semibold">Per-Capita Income</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.userId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-semibold text-amber-700 shrink-0">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                    <a
                      href={u.pointer}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-amber-600 hover:underline"
                    >
                      {u.pointer.replace("https://", "")}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.householdSize}</td>
                  <td className="px-6 py-4 text-slate-600">
                    S${u.perCapitaIncomeSgd.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <p className="text-4xl mb-3">👤</p>
                    <p>No recipients found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
