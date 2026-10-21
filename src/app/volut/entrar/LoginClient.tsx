"use client";
import { useEffect, useRef, useState } from "react";
import { signInWithCustomToken, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { browserAuth } from "@/lib/firebase/client";

export function LoginClient() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code"), state = params.get("state");
    if (code || state) {
      if (started.current) return;
      started.current = true;
      if (!code || !state) { setMessage("A resposta de autenticação veio incompleta."); return; }
      setBusy(true);
      void (async () => {
        const response = await fetch("/api/auth/exchange", {
          method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.customToken !== "string") throw new Error(result.message || "Login não autorizado.");
        const auth = browserAuth();
        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, result.customToken);
        window.history.replaceState({}, "", "/volut/entrar");
        router.replace("/painel");
      })().catch(error => { setMessage(error instanceof Error ? error.message : "Falha no login."); window.history.replaceState({}, "", "/volut/entrar"); }).finally(() => setBusy(false));
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(browserAuth(), async user => {
        if (!user) return;
        const claims = (await user.getIdTokenResult()).claims;
        if (claims.voluts === true) router.replace("/painel");
      });
      return unsubscribe;
    } catch { /* A página de login continua disponível sem configuração local. */ }
  }, [router]);
  return <div className="login-actions"><a className={"btn btn-gold btn-block" + (busy ? " btn-disabled" : "")} href={busy ? undefined : "/api/auth/start"} aria-disabled={busy}> {busy ? "Conectando…" : "Continuar com Tera ID"} <span aria-hidden="true">↗</span></a>{message && <div role="alert" className="notice error">{message}</div>}</div>;
}
