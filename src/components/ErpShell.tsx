"use client";

import ErpSidebar from "@/components/ErpSidebar";
import ErpChat from "@/components/ErpChat";
import ChatwootWidget from "@/components/ChatwootWidget";

type ChatwootUser = { id: string; email: string; name: string } | null;

export default function ErpShell({
  children,
  chatwootUser = null,
}: {
  children: React.ReactNode;
  chatwootUser?: ChatwootUser;
}) {
  const chatwootEnabled = Boolean(
    process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL &&
      process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN,
  );
  return (
    <div className="min-h-screen flex">
      <ErpSidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      {chatwootEnabled ? <ChatwootWidget user={chatwootUser} /> : <ErpChat />}
    </div>
  );
}
