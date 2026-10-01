import type { Color, MoveInput, Outcome, TeamAssignment } from "../domain/types.ts";

export type RoomCode = string & { readonly __roomCode: unique symbol };
export type GameStatus = "waiting" | "active" | "finished" | "cancelled";
export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";
export type OnlineGameResult = Outcome;
export type AuthProfile = { id: string; username: string; created_at: string; updated_at: string };
export type OnlinePlayer = Pick<AuthProfile, "id" | "username">;
export type OnlineGame = {
  id: string;
  room_code: RoomCode;
  created_by: string;
  white_player_id: string | null;
  black_player_id: string | null;
  creator_color_preference: Color | "random";
  status: GameStatus;
  initial_fen: string;
  current_fen: string;
  turn: Color;
  current_ply: number;
  revision: number;
  teams: TeamAssignment;
  result: OnlineGameResult | null;
  draw_offer_by: string | null;
  parent_game_id: string | null;
  rematch_requested_by: string | null;
  rematch_game_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};
export type OnlineMove = {
  id: number;
  game_id: string;
  ply: number;
  player_id: string;
  from_square: MoveInput["from"];
  to_square: MoveInput["to"];
  promotion: MoveInput["promotion"] | null;
  san: string;
  uci: string;
  fen_before: string;
  fen_after: string;
  created_at: string;
};
export type GameSnapshot = { game: OnlineGame; moves: OnlineMove[]; players: OnlinePlayer[] };
export type GameAction =
  | { type: "move"; move: MoveInput }
  | { type: "offer-draw" | "accept-draw" | "reject-draw" | "resign" }
  | { type: "claim"; reason: "threefold" | "fifty"; move?: MoveInput };
export type ActionRequest = {
  gameId: string;
  expectedPly: number;
  expectedRevision: number;
  action: GameAction;
};
