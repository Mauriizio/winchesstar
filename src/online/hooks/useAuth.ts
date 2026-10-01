import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AuthProfile } from "../types";
import { getSupabase, onlineConfigured } from "../supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(onlineConfigured);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(new URLSearchParams(window.location.search).has("recovery"));
  useEffect(() => {
    if (!onlineConfigured) return;
    const client = getSupabase();
    let alive = true;
    let version = 0;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      version++;
      setSession(next);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    const initialVersion = version;
    client.auth.getSession().then(({ data, error }) => {
      if (!alive || version !== initialVersion) return;
      if (error) setError("No se pudo restaurar tu sesión. Vuelve a iniciar sesión.");
      setSession(data.session);
      setLoading(false);
    }).catch(() => { if (alive) { setLoading(false); setError("No se pudo conectar con autenticación."); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    let alive = true;
    setProfile(null);
    if (userId) void getSupabase().from("profiles").select("id,username,created_at,updated_at").eq("id", userId).single()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError("No se pudo cargar tu perfil. Reintenta iniciando sesión.");
        else setProfile(data as AuthProfile);
      });
    return () => { alive = false; };
  }, [userId]);
  async function signOut() {
    const { error } = await getSupabase().auth.signOut({ scope: "local" });
    if (error) { setError("No se pudo cerrar sesión. Revisa tu conexión y reintenta."); return; }
    setProfile(null);
    setSession(null);
  }
  function finishRecovery() {
    setRecovery(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("recovery");
    window.history.replaceState(null, "", url);
  }
  return { session, profile, loading, error, recovery, finishRecovery, signOut };
}
