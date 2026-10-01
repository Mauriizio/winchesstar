import { useState, type FormEvent } from "react";
import { authError, authRedirect, cleanUsername, register } from "../online/auth";
import { getSupabase } from "../online/supabase";

export function AuthPanel({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "reset">(() => new URLSearchParams(window.location.search).has("recovery") ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const title = recovery ? "Cambiar contraseña" : mode === "register" ? "Crear cuenta" : mode === "reset" ? "Recuperar contraseña" : "Iniciar sesión";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setMessage(""); setBusy(true);
    try {
      const client = getSupabase();
      if (recovery) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setPassword(""); onRecovered();
      } else if (mode === "register") {
        if (!cleanUsername(username)) { setError("Usa de 3 a 24 letras, números o guiones bajos para tu nickname."); return; }
        const data = await register(email.trim(), password, username);
        if (!data.session) { setRegistered(true); setMessage("Revisa tu email y abre el enlace para confirmar tu cuenta. Tu invitación se conserva."); }
      } else if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect(true) });
        if (error) throw error;
        setMessage("Si existe una cuenta con ese email, recibirás un enlace para cambiar tu contraseña.");
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) { setError(authError(error as Error)); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError("");
    try {
      const { error } = await getSupabase().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authRedirect() } });
      if (error) throw error;
      setMessage("Enlace enviado. Revisa tu correo, incluida la carpeta de spam.");
    } catch (error) { setError(authError(error as Error)); }
    finally { setBusy(false); }
  }
  return <section className="online-panel auth-panel" aria-labelledby="auth-title">
    <div className="eyebrow">WINCHESSTAR · JUGAR ONLINE</div>
    <h1 id="auth-title">{title}</h1>
    <p>Tu cuenta permite continuar tus partidas desde otro dispositivo.</p>
    <form onSubmit={(event) => void submit(event)} className="online-form">
      {!recovery && <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
      {mode === "register" && !recovery && <label>Nickname<input autoComplete="nickname" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={username} onChange={(e) => setUsername(e.target.value)} /><span className="small">Será tu nombre visible. No uses tu email.</span></label>}
      {(mode !== "reset" || recovery) && <label>Contraseña<input type="password" autoComplete={mode === "register" || recovery ? "new-password" : "current-password"} minLength={mode === "register" || recovery ? 10 : undefined} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className="primary full" disabled={busy}>{busy ? "Un momento…" : title}</button>
    </form>
    {registered && <button className="text-button" disabled={busy} onClick={() => void resend()}>Reenviar confirmación</button>}
    {!recovery && <div className="button-row">
      {(["login", "register", "reset"] as const).filter((item) => item !== mode).map((item) => <button key={item} className="text-button" disabled={busy} onClick={() => { setMode(item); setError(""); setMessage(""); }}>{item === "login" ? "Ya tengo cuenta" : item === "register" ? "Crear cuenta" : "Olvidé mi contraseña"}</button>)}
    </div>}
  </section>;
}
