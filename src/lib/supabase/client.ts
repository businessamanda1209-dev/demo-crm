"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient(config.url, config.anonKey);
}
