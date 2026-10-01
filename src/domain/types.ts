import type { Color, PieceSymbol, Square } from "chess.js";
export type { Color, PieceSymbol, Square };
export type Promotion = "q" | "r" | "b" | "n";
export type MoveInput = { from: Square; to: Square; promotion?: Promotion };
export type TeamAssignment = Record<Color, string>;
export type ClaimReason = "threefold" | "fifty";
export type ResultReason =
  | ClaimReason
  | "mate"
  | "stalemate"
  | "dead"
  | "fivefold"
  | "seventyfive"
  | "agreement"
  | "resignation";
export type Outcome = {
  winner: Color | null;
  reason: ResultReason;
  declaredMove?: MoveInput;
};
export const opposite = (color: Color): Color => (color === "w" ? "b" : "w");
export const colorName = (color: Color) =>
  color === "w" ? "blancas" : "negras";
export const roleNames: Record<PieceSymbol, string> = {
  k: "Rey",
  q: "Dama",
  r: "Torre",
  b: "Alfil",
  n: "Caballo",
  p: "Peón",
};
export const resultNames: Record<ResultReason, string> = {
  mate: "Jaque mate",
  stalemate: "Rey ahogado",
  dead: "Posición muerta",
  fivefold: "Quíntuple repetición",
  seventyfive: "Regla de 75 jugadas",
  threefold: "Triple repetición",
  fifty: "Regla de 50 jugadas",
  agreement: "Tablas por acuerdo",
  resignation: "Rendición",
};
