import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Safe for API routes — returns null instead of redirecting. */
export async function getAuthUser() {
  return getCurrentUser();
}

/** For page/layout use — redirects to /login when unauthenticated. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
