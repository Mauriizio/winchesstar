import { Game } from "../domain/game.ts";
import type { Color } from "../domain/types.ts";
import type { GameSnapshot, OnlineGame } from "./types.ts";

export function playerColor(game: OnlineGame, userId: string): Color | null {
  if (game.white_player_id === userId) return "w";
  if (game.black_player_id === userId) return "b";
  return null;
}

/** Replays the complete official history; a FEN alone loses repetitions. */
export function reconstruct(snapshot: GameSnapshot): Game {
  const { game: row, moves } = snapshot;
  const game = new Game(row.teams, row.initial_fen);
  if (moves.length !== row.current_ply) throw new Error("INCONSISTENT_STATE");
  for (const [index, move] of moves.entries()) {
    if (move.ply !== index + 1 || move.fen_before !== game.rules.fen())
      throw new Error("INCONSISTENT_STATE");
    const played = game.play({ from: move.from_square, to: move.to_square,
      ...(move.promotion ? { promotion: move.promotion } : {}) });
    if (game.rules.fen() !== move.fen_after || played.san !== move.san)
      throw new Error("INCONSISTENT_STATE");
  }
  if (game.rules.fen() !== row.current_fen || game.rules.turn() !== row.turn)
    throw new Error("INCONSISTENT_STATE");
  game.result = row.result;
  game.offer = row.draw_offer_by ? playerColor(row, row.draw_offer_by) : null;
  return game;
}
