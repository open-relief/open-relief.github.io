"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminMe, adminLogout } from "@/lib/api";
import { useApp } from "../AppContext";

const navItems = [
  { href: "/admin",         label: "Dashboard",       icon: "▦" },
  { href: "/admin/payouts", label: "Payout Requests",  icon: "↗" },
  { href: "/admin/users",   label: "Recipients",       icon: "◉" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("admin@openrelief.org");
  const [checking, setChecking] = useState(true);
  const { isApp } = useApp();

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
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;
  if (checking) {
    return (
      <div className="checking-screen">
        <div className="checking-dot" />
        <div className="checking-dot" />
        <div className="checking-dot" />
      </div>
    );
  }

  async function handleLogout() {
    await adminLogout();
    router.push("/admin/login");
  }

  if (isApp) {
    return (
      <div className="min-h-screen flex flex-col pt-14 animate-fade-in" style={{ background: "var(--bg)" }}>
        <header style={{ background: "rgba(7,11,20,0.9)", borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="fixed top-0 left-0 right-0 p-4 z-20">
          <Link href="/" className="text-lg font-bold" style={{ color: "#f59e0b" }}>OpenRelief Admin</Link>
        </header>
        <main className="flex-1 p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex animate-fade-in" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "#f59e0b", color: "#000" }}
            >
              OR
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">OpenRelief</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname === item.href + "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.25)",
                } : {
                  color: "#64748b",
                  border: "1px solid transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer user info */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              {userEmail[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{userEmail}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#10b981" }} />
                <span className="text-xs" style={{ color: "#64748b" }}>Admin</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="text-xs transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              Sign out
            </button>
            <Link
              href="/"
              className="text-xs transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              ← Portal select
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen p-8" style={{ marginLeft: 260 }}>
        {children}
      </main>
    </div>
  );
}
