"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { getSiteUrl, getSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const GradientBackground = dynamic(
  () => import("./GradientBackground").then((m) => m.GradientBackground),
  { ssr: false }
);

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getSiteUrl()}/auth/callback` },
    });
    setLoading(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) { setError(copy.configMissing); return; }
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup" && !firstName.trim()) {
      setError("Por favor, informe seu nome."); setLoading(false); return;
    }
    if (mode === "signup" && !lastName.trim()) {
      setError("Por favor, informe seu sobrenome."); setLoading(false); return;
    }

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${getSiteUrl()}/`,
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`,
              },
            },
          });

    if (result.error) {
      setLoading(false);
      setError(result.error.message || copy.genericError);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setLoading(false);
      setMessage(copy.checkEmail);
      setMode("signin");
      return;
    }
    // Success: keep button in loading state — navigation will tear down this component
    router.replace("/erp");
    router.refresh();
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "24px",
      background: "#000",
    }}>
      {/* Craft gradient background — client-only to avoid hydration mismatch */}
      <GradientBackground />

      {/* Glass panel */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: "1040px",
        height: "clamp(560px, 82vh, 720px)",
        display: "flex",
        borderRadius: "22px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
        backdropFilter: "blur(1px)",
      }}>

        {/* LEFT — form pane */}
        <div style={{
          width: "420px",
          minWidth: "420px",
          padding: "48px 44px",
          background: "rgba(4,4,4,0.80)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}>

          {/* Logo */}
          <div style={{ marginBottom: "36px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1 }}>
              <span style={{ color: "#fff" }}>LIBA</span>
              <span style={{ color: "#4ade80" }}>+</span>
            </span>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.3px" }}>
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", margin: "0 0 28px 0" }}>
            {mode === "signin" ? "Bem-vindo de volta!" : "Crie sua conta na Liba+."}
          </p>

          {/* Alerts */}
          {!config && (
            <div style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "12.5px", color: "#fbbf24", marginBottom: "16px" }}>
              {copy.configMissing}
            </div>
          )}
          {message && (
            <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "12.5px", color: "#4ade80", marginBottom: "16px" }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "12.5px", color: "#f87171", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading || !config}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(74,222,128,0.45)",
              borderRadius: "10px",
              padding: "11px 0",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !config ? 0.5 : 1,
              transition: "background 0.15s, border-color 0.15s",
              marginBottom: "20px",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,222,128,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* First + Last name — signup only */}
            {mode === "signup" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input
                  type="text"
                  required
                  placeholder="Nome"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    color: "#fff",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <input
                  type="text"
                  required
                  placeholder="Sobrenome"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "11px 14px",
                    color: "#fff",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
            )}
            {/* Email */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="Digite seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "11px 14px 11px 40px",
                  color: "#fff",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {/* Password */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                placeholder="Digite sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "11px 40px 11px 40px",
                  color: "#fff",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: showPassword ? "#4ade80" : "rgba(255,255,255,0.3)",
                  padding: 0, display: "flex",
                }}
              >
                {showPassword ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>

            {/* Remember / Forgot */}
            {mode === "signin" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{
                      width: "15px", height: "15px",
                      accentColor: "#4ade80",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Lembre-me</span>
                </label>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#4ade80", fontFamily: "inherit", padding: 0 }}
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !config}
              style={{
                width: "100%",
                background: loading || !config ? "rgba(74,222,128,0.4)" : "#4ade80",
                border: "none",
                borderRadius: "10px",
                padding: "12px 0",
                color: "#0a1a0a",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading || !config ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                marginTop: "4px",
                transition: "background 0.15s",
                letterSpacing: "0.1px",
              }}
              onMouseEnter={e => { if (!loading && config) e.currentTarget.style.background = "#22c55e"; }}
              onMouseLeave={e => { if (!loading && config) e.currentTarget.style.background = "#4ade80"; }}
            >
              {loading
                ? (mode === "signin" ? "Entrando na sua conta..." : "Criando conta...")
                : (mode === "signin" ? "Entrar" : "Criar conta")}
            </button>

            {/* Switch mode */}
            <p style={{ textAlign: "center", fontSize: "13.5px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>
              {mode === "signin" ? "Não possui uma conta? " : "Já tem conta? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setMessage(null); setFirstName(""); setLastName(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", fontWeight: 600, fontSize: "13.5px", fontFamily: "inherit", padding: 0 }}
              >
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </form>
        </div>

        {/* RIGHT — transparent glass pane showing gradient */}
        <div style={{
          flex: 1,
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          background: "rgba(0,0,0,0.12)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle vignette overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 60%)",
            pointerEvents: "none",
          }} />
        </div>
      </div>
    </div>
  );
}
