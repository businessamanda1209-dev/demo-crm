"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ErpShell from "@/components/ErpShell";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/meet/")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/erp")) {
    return <ErpShell>{children}</ErpShell>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
