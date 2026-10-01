import type { AuthError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { normalizeRoomCode } from "./roomCode";

const INVITATION_KEY = "winchesstar.invitation";
export function cleanUsername(value: string): string | null {
  const username = value.trim();
  return /^[A-Za-z0-9_]{3,24}$/.test(username) ? username : null;
}
export function pendingInvitation() {
  const fromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get("room") ?? "");
  try {
    if (fromUrl) sessionStorage.setItem(INVITATION_KEY, fromUrl);
    return fromUrl ?? normalizeRoomCode(sessionStorage.getItem(INVITATION_KEY) ?? "");
  } catch { return fromUrl; }
}
export function clearInvitation() {
  try { sessionStorage.removeItem(INVITATION_KEY); } catch { /* URL still retains the invitation. */ }
}
export function authRedirect(recovery = false): string {
  const url = new URL("/", window.location.origin);
  const room = pendingInvitation();
  if (room) url.searchParams.set("room", room);
  if (recovery) url.searchParams.set("recovery", "1");
  else url.searchParams.set("online", "1");
  return url.href;
}
export function authError(error: AuthError | Error | null): string {
  const code = error && "code" in error ? error.code : undefined;
  if (code === "invalid_credentials") return "Email o contraseña incorrectos.";
  if (code === "email_not_confirmed") return "Confirma tu email antes de iniciar sesión.";
  if (code === "user_already_exists" || code === "email_exists") return "Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.";
  if (code === "weak_password") return "Usa una contraseña de al menos 10 caracteres.";
  if (code === "same_password") return "Elige una contraseña distinta a la anterior.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "Espera unos minutos antes de volver a intentarlo.";
  if (code === "otp_expired" || code === "flow_state_expired") return "El enlace ha caducado. Solicita uno nuevo.";
  if (error?.message === "USERNAME_TAKEN") return "Ese nickname ya existe. Elige otro.";
  return "No se pudo completar la solicitud. Revisa los datos y tu conexión e inténtalo otra vez.";
}
export async function register(email: string, password: string, username: string) {
  const clean = cleanUsername(username);
  if (!clean) throw new Error("INVALID_USERNAME");
  const client = getSupabase();
  const { data: available, error: checkError } = await client.rpc("username_available", { candidate: clean });
  if (checkError) throw checkError;
  if (!available) throw new Error("USERNAME_TAKEN");
  const result = await client.auth.signUp({ email, password,
    options: { data: { username: clean }, emailRedirectTo: authRedirect() } });
  if (result.error) {
    // Resolve a registration race without exposing database errors or email addresses.
    const { data: stillAvailable } = await client.rpc("username_available", { candidate: clean });
    if (stillAvailable === false) throw new Error("USERNAME_TAKEN");
    throw result.error;
  }
  return result.data;
}
