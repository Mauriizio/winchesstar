import type { Color, Square } from "../domain/types";
export const squares: Square[] = Array.from(
  { length: 64 },
  (_, i) => `${"abcdefgh"[i % 8]}${Math.floor(i / 8) + 1}` as Square,
);
export function squareToDisplay(square: Square, view: Color) {
  if (!/^[a-h][1-8]$/.test(square)) throw new RangeError("Casilla inválida");
  const file = square.charCodeAt(0) - 97,
    rank = Number(square[1]);
  return view === "w"
    ? { col: file, row: 8 - rank }
    : { col: 7 - file, row: rank - 1 };
}
export function displayToSquare(row: number, col: number, view: Color): Square {
  if (![row, col].every((n) => Number.isInteger(n) && n >= 0 && n < 8))
    throw new RangeError("Fuera del tablero");
  return `${"abcdefgh"[view === "w" ? col : 7 - col]}${view === "w" ? 8 - row : row + 1}` as Square;
}
export const isDarkSquare = (s: Square) =>
  (s.charCodeAt(0) - 97 + Number(s[1]) - 1) % 2 === 0;
