"use client";

import Link from "next/link";
import BackButton from "./BackButton";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 animate-slide-down">
      <div
        style={{
          background: "rgba(7,11,20,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
        className="flex items-center gap-3 px-5 py-3.5"
      >
        <BackButton />
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          style={{ color: "#f59e0b" }}
        >
          {title || "OpenRelief"}
        </Link>
      </div>
    </header>
  );
}