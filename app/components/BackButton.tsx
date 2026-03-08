"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  // don't show a back button on the top‑level home route
  if (pathname === "/") return null;

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm font-medium p-2 rounded-md hover:bg-gray-200 transition-colors duration-150"
    >
      <span className="text-lg">←</span> Back
    </button>
  );
}