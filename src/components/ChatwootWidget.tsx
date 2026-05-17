"use client";

import { useEffect } from "react";

export default function ChatwootWidget({
  user,
}: {
  user?: { id: string; email: string; name: string } | null;
}) {
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
    const token = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN;
    if (!baseUrl || !token) return;
    if ((window as any).__chatwootLoaded) return;
    (window as any).__chatwootLoaded = true;

    (window as any).chatwootSettings = {
      hideMessageBubble: false,
      position: "right",
      locale: "pt_BR",
      type: "standard",
    };

    const script = document.createElement("script");
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).chatwootSDK?.run({ websiteToken: token, baseUrl });
      window.addEventListener("chatwoot:ready", () => {
        if (user) {
          (window as any).$chatwoot?.setUser(user.id, {
            email: user.email,
            name: user.name,
          });
        }
      });
    };
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch {
        /* ignore */
      }
    };
  }, [user]);

  return null;
}
