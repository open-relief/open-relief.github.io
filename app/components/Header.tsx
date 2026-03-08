"use client";

import Link from "next/link";
import BackButton from "./BackButton";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 flex items-center gap-4 p-4 bg-white/75 backdrop-blur-sm shadow-md z-20 animate-fade-in">
      <BackButton />
      <Link href="/" className="text-xl font-semibold">
        {title || "Open Relief"}
      </Link>
    </header>
  );
}