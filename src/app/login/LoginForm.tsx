"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { getSiteUrl, getSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = t(lang).auth;
  const config = getSupabaseConfig();
  const supabase = useMemo(
    () => (config ? createSupabaseBrowserClient() : null),
    [config],
  );
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setError(copy.configMissing);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${getSiteUrl()}/`,
            },
          });

    setLoading(false);

    if (result.error) {
      setError(result.error.message || copy.genericError);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage(copy.checkEmail);
      setMode("signin");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-1">
            <div className="h-12 w-12 rounded-xl bg-brand-600 text-white grid place-items-center font-bold text-xl tracking-tight">
              L+
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Liba+
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === "signin" ? copy.subtitle : copy.signUpSubtitle}
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          {!config && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
              {copy.configMissing}
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30">
              {error}
            </div>
          )}

          <div>
            <label className="label">{copy.email}</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label">{copy.password}</label>
            <input
              className="input"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading || !config}>
            {loading
              ? mode === "signin"
                ? copy.signingIn
                : copy.signingUp
              : mode === "signin"
                ? copy.signIn
                : copy.signUp}
          </button>

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signin" ? copy.switchToSignUp : copy.switchToSignIn}
          </button>
        </form>
      </div>
    </div>
  );
}
