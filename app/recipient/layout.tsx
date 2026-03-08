"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { recipientMe, recipientLogout, type RecipientUser } from "@/lib/api";
import { useApp } from "../AppContext";

const navItems = [
  { href: "/recipient", label: "Dashboard", icon: "🏠" },
  { href: "/recipient/apply", label: "Apply for Aid", icon: "📝" },
  { href: "/recipient/status", label: "My Applications", icon: "📋" },
  { href: "/recipient/profile", label: "Profile", icon: "👤" },
];

export default function RecipientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RecipientUser | null>(null);
  const [checking, setChecking] = useState(true);
  const { isApp } = useApp();

  const isLoginPage = pathname === "/recipient/login" || pathname === "/recipient/login/";

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    setChecking(true);
    recipientMe().then(({ data }) => {
      if (!data?.authenticated) {
        router.replace("/recipient/login");
      } else {
        setUser(data.user);
        setChecking(false);
      }
    });
  }, [isLoginPage]); // re-run when user leaves the login page

  if (isLoginPage) return <>{children}</>;
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <p className="text-slate-500 text-sm">Checking session…</p>
      </div>
    );
  }

  async function handleLogout() {
    await recipientLogout();
    router.push("/recipient/login");
  }

  // mobile rendering when our custom agent is detected
  if (isApp) {
    return (
      // container itself is locked; only the <main> area should scroll
      <div className="min-h-screen flex flex-col bg-emerald-50 overflow-hidden">
        <header className="bg-emerald-600 text-white p-4 flex-shrink-0 flex items-center">
          <Link href="/" className="text-lg font-semibold">
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
    <div className="h-full flex bg-emerald-50 pt-16 overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-emerald-100 flex flex-col fixed h-full z-10">
        <div className="px-7 py-6 border-b border-emerald-100">
          <Link href="/" className="text-2xl font-bold text-emerald-600 hover:text-emerald-500">
            Open Relief
          </Link>
          <p className="text-sm text-slate-400 mt-0.5">Recipient Portal</p>
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
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-7 py-5 border-t border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-base font-bold text-white">
              {user?.email?.[0]?.toUpperCase() ?? "R"}
            </div>
            <div>
              <p className="text-base font-medium text-slate-800 truncate max-w-[140px]">
                {user?.email ?? "Recipient"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            <span className="text-sm text-slate-500">Signed in</span>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 block text-sm text-slate-400 hover:text-red-500 transition"
          >
            Sign out
          </button>
          <Link href="/" className="mt-1 block text-sm text-slate-400 hover:text-slate-600">
            ← Portal select
          </Link>
        </div>
      </aside>

      {/* Main content – only this area scrolls */}
      <main className="flex-1 ml-72 p-10 overflow-y-auto h-full">{children}</main>
    </div>
  );
}
