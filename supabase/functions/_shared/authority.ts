import { reconstruct, playerColor } from "../../../src/online/state.ts";
import type { ActionRequest, GameSnapshot, OnlineMove } from "../../../src/online/types.ts";
import type { MoveInput } from "../../../src/domain/types.ts";

function validMove(value: unknown): value is MoveInput {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return typeof m.from === "string" && /^[a-h][1-8]$/.test(m.from) &&
    typeof m.to === "string" && /^[a-h][1-8]$/.test(m.to) &&
    (m.promotion === undefined || ["q", "r", "b", "n"].includes(String(m.promotion)));
}
export function parseAction(value: unknown): ActionRequest {
  if (!value || typeof value !== "object") throw new Error("INVALID_INPUT");
  const r = value as ActionRequest;
  if (typeof r.gameId !== "string" || !/^[0-9a-f-]{36}$/i.test(r.gameId) ||
      !Number.isSafeInteger(r.expectedPly) || r.expectedPly < 0 ||
      !Number.isSafeInteger(r.expectedRevision) || r.expectedRevision < 0 || !r.action)
    throw new Error("INVALID_INPUT");
  const a = r.action;
  if (a.type === "move") { if (!validMove(a.move)) throw new Error("INVALID_INPUT"); }
  else if (a.type === "claim") {
    if (!["threefold", "fifty"].includes(a.reason) || (a.move !== undefined && !validMove(a.move)))
      throw new Error("INVALID_INPUT");
  } else if (!["offer-draw", "accept-draw", "reject-draw", "resign"].includes(a.type))
    throw new Error("INVALID_INPUT");
  return r;
}

/** Pure authority, used by the Edge Function and integration tests. Never trusts client FEN/color/result. */
export function authorizeAction(snapshot: GameSnapshot, userId: string, request: ActionRequest) {
  const row = snapshot.game;
  const color = playerColor(row, userId);
  if (!color) throw new Error("NOT_PARTICIPANT");
  if (row.status !== "active") throw new Error(row.status === "finished" ? "FINISHED" : "NOT_ACTIVE");
  if (request.gameId !== row.id || request.expectedPly !== row.current_ply || request.expectedRevision !== row.revision)
    throw new Error("STALE_STATE");
  const game = reconstruct(snapshot);
  const action = request.action;
  let move: Omit<OnlineMove, "id" | "created_at" | "game_id"> | null = null;
  if (["move", "claim", "offer-draw"].includes(action.type) && game.rules.turn() !== color)
    throw new Error("NOT_YOUR_TURN");
  if (action.type === "move") {
    try { game.play(action.move); } catch { throw new Error("INVALID_MOVE"); }
    const last = game.rules.history().at(-1)!;
    move = { ply: row.current_ply + 1, player_id: userId,
      from_square: last.from, to_square: last.to, promotion: action.move.promotion ?? null,
      san: last.san, uci: last.from + last.to + (last.promotion ?? ""),
      fen_before: row.current_fen, fen_after: game.rules.fen() };
  } else if (action.type === "resign") {
    game.result = game.outcomes.resign(game.rules, color);
    game.offer = null;
  } else if (action.type === "offer-draw") {
    try { game.offerDraw(); } catch { throw new Error("OFFER_UNAVAILABLE"); }
  } else if (action.type === "accept-draw" || action.type === "reject-draw") {
    if (!row.draw_offer_by) throw new Error("NO_OFFER");
    if (row.draw_offer_by === userId) throw new Error("OWN_OFFER");
    if (action.type === "accept-draw") game.acceptDraw(); else game.rejectDraw();
  } else if (action.type === "claim") {
    try { game.claim(action.reason, action.move); } catch { throw new Error("INVALID_CLAIM"); }
  }
  return { current_fen: game.rules.fen(), turn: game.rules.turn(), result: game.result,
    draw_offer_by: game.offer === "w" ? row.white_player_id : game.offer === "b" ? row.black_player_id : null,
    move };
}
