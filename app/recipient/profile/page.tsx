"use client";

import { useEffect, useState } from "react";
import { recipientMe, type RecipientUser } from "@/lib/api";

export default function RecipientProfile() {
  const [user, setUser] = useState<RecipientUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recipientMe().then(({ data }) => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 mt-1">Your account and wallet details</p>
      </div>

      {/* Avatar + email */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-xl font-bold text-emerald-700">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-lg">{user.email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
              <span className="text-sm text-slate-500">Active recipient account</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-slate-800">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Household Size</p>
            <p className="text-sm text-slate-800">{user.householdSize} member{user.householdSize !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Per-Capita Income</p>
            <p className="text-sm text-slate-800">S${user.perCapitaIncomeSgd.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Open Payments Wallet</h3>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Wallet Address (pointer)</p>
          <p className="text-sm font-mono text-slate-700 break-all bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            {user.pointer || <span className="text-slate-400 not-italic font-sans">— not set —</span>}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Approved payouts are sent directly to this wallet address.
          </p>
        </div>
      </div>
    </div>
  );
}

