import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { ActionRequest, GameSnapshot, OnlineGame, OnlinePlayer, RoomCode } from "./types";

export async function loadGame(id: string): Promise<GameSnapshot> {
  const { data, error } = await getSupabase().rpc("game_snapshot", { game_id: id });
  if (error) throw error;
  if (!data) throw new Error("NOT_FOUND");
  return data as GameSnapshot;
}
export async function createGame(color: "w" | "b" | "random", whiteTeam: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_game", { color_preference: color, white_team: whiteTeam });
  if (error) throw error;
  return data as string;
}
export async function joinGame(code: RoomCode): Promise<string> {
  const { data, error } = await getSupabase().rpc("join_game", { code });
  if (error) throw error;
  return data as string;
}
export async function cancelGame(id: string) {
  const { error } = await getSupabase().rpc("cancel_game", { game_id: id });
  if (error) throw error;
}
export async function rematch(id: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("request_rematch", { game_id: id });
  if (error) throw error;
  return data as string | null;
}
export async function sendAction(request: ActionRequest): Promise<GameSnapshot> {
  const { data, error } = await getSupabase().functions.invoke("game-action", { body: request });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? "SERVICE_UNAVAILABLE");
    }
    throw error;
  }
  return data as GameSnapshot;
}
export async function listGames(offset = 0): Promise<{ games: OnlineGame[]; players: OnlinePlayer[] }> {
  const client = getSupabase();
  const { data, error } = await client.from("games").select("*").order("created_at", { ascending: false }).range(offset, offset + 19);
  if (error) throw error;
  const games = data as OnlineGame[];
  const ids = [...new Set(games.flatMap((g) => [g.created_by, g.white_player_id, g.black_player_id]).filter((id): id is string => !!id))];
  if (!ids.length) return { games, players: [] };
  const { data: players, error: profileError } = await client.from("profiles").select("id,username").in("id", ids);
  if (profileError) throw profileError;
  return { games, players: players as OnlinePlayer[] };
}
