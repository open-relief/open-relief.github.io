"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminMe, adminLogout } from "@/lib/api";
import { useApp } from "../AppContext";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/payouts", label: "Payout Requests", icon: "💸" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("admin@openrelief.org");
  const [checking, setChecking] = useState(true);
  const { isApp } = useApp();

  // Login page doesn't need the shell
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    setChecking(true);
    adminMe().then(({ data }) => {
      if (!data?.authenticated) {
        router.replace("/admin/login");
      } else {
        if (data.user?.email) setUserEmail(data.user.email);
        setChecking(false);
      }
    });
  }, [isLoginPage]); // re-run when user leaves the login page

  if (isLoginPage) return <>{children}</>;
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Checking session…</p>
      </div>
    );
  }

  async function handleLogout() {
    await adminLogout();
    router.push("/admin/login");
  }

  if (isApp) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-100 pt-16 animate-fade-in overflow-hidden">
        <header className="bg-slate-900 text-white p-4 flex-shrink-0 flex items-center">
          <Link href="/" className="text-lg font-semibold text-amber-400">
            Open Relief
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-xl leading-none p-1 hover:opacity-75"
            aria-label="Reload"
          >
            🔄
          </button>
        </header>
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-100 pt-16 overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="px-7 py-6 border-b border-slate-700">
          <Link href="/" className="text-2xl font-bold text-amber-400 hover:text-amber-300">
            Open Relief
          </Link>
          <p className="text-sm text-slate-400 mt-0.5">Admin Portal</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? "bg-amber-500 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-7 py-5 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-base font-bold">
              A
            </div>
            <div>
              <p className="text-base font-medium text-white">Admin User</p>
              <p className="text-sm text-slate-400">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 block text-sm text-slate-400 hover:text-red-400 transition"
          >
            Sign out
          </button>
          <Link href="/" className="mt-1 block text-sm text-slate-400 hover:text-slate-200">
            ← Back to portal select
          </Link>
        </div>
      </aside>

      {/* Main content – only this area scrolls */}
      <main className="flex-1 ml-72 p-10 overflow-y-auto h-full">{children}</main>
    </div>
  );
}
