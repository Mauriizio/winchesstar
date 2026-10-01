import { createClient } from "@supabase/supabase-js";
import { authorizeAction, parseAction } from "../_shared/authority.ts";
import type { GameSnapshot } from "../../../src/online/types.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,http://127.0.0.1:5173,https://ajedrez-educativo-tematico.vercel.app")
  .split(",").map((origin) => origin.trim());
const knownErrors = new Set(["AUTH_REQUIRED", "NOT_FOUND", "NOT_PARTICIPANT", "NOT_ACTIVE", "FINISHED", "STALE_STATE", "NOT_YOUR_TURN", "INVALID_INPUT", "INVALID_MOVE", "INVALID_CLAIM", "OWN_OFFER", "NO_OFFER", "OFFER_UNAVAILABLE", "INCONSISTENT_STATE"]);

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  const headers = { "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" };
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers });
  if (origin && !allowedOrigins.includes(origin)) return reply({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "AUTH_REQUIRED" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    // getUser validates the token with Auth; never decode-and-trust a client JWT.
    const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply({ error: "AUTH_REQUIRED" }, 401);
    const text = await request.text();
    if (text.length > 4096) return reply({ error: "INVALID_INPUT" }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply({ error: "INVALID_INPUT" }, 400); }
    const action = parseAction(body);
    const { data, error } = await userClient.rpc("game_snapshot", { game_id: action.gameId });
    if (error) throw error;
    if (!data) return reply({ error: "NOT_FOUND" }, 404);
    const next = authorizeAction(data as GameSnapshot, user.id, action);
    // This credential exists only in the Edge runtime. The browser has no table write grant.
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: commitError } = await admin.rpc("commit_game_action", {
      game_id: action.gameId, actor: user.id, expected_ply: action.expectedPly,
      expected_revision: action.expectedRevision, next_state: next,
    });
    if (commitError) throw commitError;
    const { data: official, error: snapshotError } = await userClient.rpc("game_snapshot", { game_id: action.gameId });
    if (snapshotError) throw snapshotError;
    return reply(official);
  } catch (error) {
    const message = error instanceof Error ? error.message :
      typeof error === "object" && error && "message" in error ? String(error.message) : "";
    const code = knownErrors.has(message) ? message : "SERVICE_UNAVAILABLE";
    return reply({ error: code }, code === "STALE_STATE" ? 409 : code === "SERVICE_UNAVAILABLE" ? 503 : 400);
  }
});
