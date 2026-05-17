"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/meet/")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/erp")) {
    // The /erp segment owns its own layout (src/app/erp/layout.tsx), which
    // wraps children in ErpShell on the server with the authenticated user.
    return <>{children}</>;
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
