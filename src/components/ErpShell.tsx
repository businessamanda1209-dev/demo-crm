"use client";

import ErpSidebar from "@/components/ErpSidebar";
import ErpChat from "@/components/ErpChat";

export default function ErpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <ErpSidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <ErpChat />
    </div>
  );
}
