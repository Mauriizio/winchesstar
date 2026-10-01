import { Chess, DEFAULT_POSITION } from "chess.js";
import type { Color, MoveInput, Square } from "./types.ts";

/** Sole owner of mutable legal state. No image, team or UI dependency. */
export class RulesEngine {
  private readonly chess: Chess;
  private readonly occurrences = new Map<string, number>();
  readonly initialFen: string;
  constructor(initialFen = DEFAULT_POSITION, moves: readonly MoveInput[] = []) {
    this.chess = new Chess(initialFen);
    this.initialFen = initialFen;
    this.countPosition();
    for (const move of moves) this.move(move);
  }
  private countPosition() {
    const key = this.positionKey();
    this.occurrences.set(key, (this.occurrences.get(key) ?? 0) + 1);
  }
  positionKey() {
    return this.fen().split(" ").slice(0, 4).join(" ");
  }
  repetitions() {
    return this.occurrences.get(this.positionKey()) ?? 0;
  }
  halfmoves() {
    return Number(this.fen().split(" ")[4]);
  }
  fen() {
    return this.chess.fen();
  }
  turn() {
    return this.chess.turn();
  }
  get(square: Square) {
    return this.chess.get(square);
  }
  pieces() {
    return this.chess
      .board()
      .flat()
      .filter((p) => p !== null);
  }
  legalMoves(square?: Square) {
    return square
      ? this.chess.moves({ square, verbose: true })
      : this.chess.moves({ verbose: true });
  }
  history() {
    return this.chess.history({ verbose: true });
  }
  inputs(): MoveInput[] {
    return this.history().map((m) => ({
      from: m.from,
      to: m.to,
      ...(m.promotion
        ? { promotion: m.promotion as MoveInput["promotion"] }
        : {}),
    }));
  }
  uci() {
    return this.inputs().map((m) => m.from + m.to + (m.promotion ?? ""));
  }
  check() {
    return this.chess.isCheck();
  }
  checkmate() {
    return this.chess.isCheckmate();
  }
  stalemate() {
    return this.chess.isStalemate();
  }
  insufficientMaterial() {
    return this.chess.isInsufficientMaterial();
  }
  attacked(square: Square, by: Color) {
    return this.chess.isAttacked(square, by);
  }
  move(input: MoveInput) {
    // Explicit promotion is mandatory; never silently choose a queen.
    const legal = this.legalMoves(input.from).find(
      (m) => m.to === input.to && m.promotion === input.promotion,
    );
    if (!legal) throw new Error("Movimiento ilegal");
    const move = this.chess.move(input);
    this.countPosition();
    return move;
  }
  clone() {
    return new RulesEngine(this.initialFen, this.inputs());
  }
}
