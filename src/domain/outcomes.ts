import { RulesEngine } from "./rules.ts";
import {
  opposite,
  type ClaimReason,
  type Color,
  type MoveInput,
  type Outcome,
} from "./types.ts";
import { isDarkSquare, squares } from "../board/geometry.ts";

/** Proof for a closed pawn wall: no pawn can move/capture, no king can ever
 * reach a capturable enemy pawn, even with the other king removed. This is
 * a conservative overapproximation; no timeout is interpreted as a draw. */
export function closedPawnWall(engine: RulesEngine): boolean {
  const pieces = engine.pieces();
  const pawns = pieces.filter((p) => p.type === "p");
  if (!pawns.length || pieces.some((p) => p.type !== "p" && p.type !== "k"))
    return false;
  // Includes en passant, which static adjacency alone cannot rule out.
  if (engine.legalMoves().some(move => move.piece === "p")) return false;
  for (const pawn of pawns) {
    const file = pawn.square.charCodeAt(0),
      rank = Number(pawn.square[1]);
    const nextRank = rank + (pawn.color === "w" ? 1 : -1);
    const ahead =
      `${String.fromCharCode(file)}${nextRank}` as typeof pawn.square;
    if (engine.get(ahead)?.type !== "p") return false;
    for (const delta of [-1, 1]) {
      if (file + delta < 97 || file + delta > 104) continue;
      const target = engine.get(
        `${String.fromCharCode(file + delta)}${nextRank}` as typeof pawn.square,
      );
      if (target?.type === "p" && target.color !== pawn.color) return false;
    }
  }
  const reachable: Record<Color, Set<string>> = { w: new Set(), b: new Set() };
  for (const color of ["w", "b"] as const) {
    const king = pieces.find((p) => p.type === "k" && p.color === color)!;
    const attackedByPawn = (s: string) =>
      pawns.some(
        (p) =>
          p.color !== color &&
          Number(s[1]) === Number(p.square[1]) + (p.color === "w" ? 1 : -1) &&
          Math.abs(s.charCodeAt(0) - p.square.charCodeAt(0)) === 1,
      );
    const queue = [king.square];
    reachable[color].add(king.square);
    while (queue.length) {
      const current = queue.pop()!;
      for (const next of squares) {
        if (
          Math.max(
            Math.abs(next.charCodeAt(0) - current.charCodeAt(0)),
            Math.abs(Number(next[1]) - Number(current[1])),
          ) !== 1 ||
          attackedByPawn(next)
        )
          continue;
        const occupant = engine.get(next);
        if (occupant?.type === "p") {
          if (occupant.color !== color) return false; // A possible first capture breaks the proof.
          continue;
        }
        if (!reachable[color].has(next)) {
          reachable[color].add(next);
          queue.push(next);
        }
      }
    }
  }
  // No pawn can ever check the opposing king; adjacent kings cannot legally check.
  return true;
}

export function isDead(engine: RulesEngine): boolean {
  return engine.insufficientMaterial() || closedPawnWall(engine);
}

/** Material impossibility, not inability to FORCE mate. Two knights can mate.
 * Opposing material may help to block escape squares. Unknown positions are
 * treated as potentially mating; see docs/COVERAGE.md for the exact boundary. */
export function canPossiblyMate(engine: RulesEngine, color: Color): boolean {
  if (isDead(engine)) return false;
  const own = engine
    .pieces()
    .filter((p) => p.color === color && p.type !== "k");
  const enemy = engine
    .pieces()
    .filter((p) => p.color !== color && p.type !== "k");
  if (!own.length) return false;
  if (own.some((p) => ["p", "r", "q"].includes(p.type))) return true;
  if (own.filter((p) => p.type === "n").length >= 2) return true;
  if (own.some((p) => p.type === "n") && own.some((p) => p.type === "b"))
    return true;
  if (
    new Set(
      own.filter((p) => p.type === "b").map((p) => isDarkSquare(p.square)),
    ).size === 2
  )
    return true;
  if (own.every((p) => p.type === "b")) {
    const shade = isDarkSquare(own[0].square);
    return enemy.some(
      (p) => p.type !== "b" || isDarkSquare(p.square) !== shade,
    );
  }
  // A lone knight cannot mate a bare king, nor a king supported only by queens.
  return enemy.some((p) => p.type !== "q");
}

export class OutcomeService {
  automatic(engine: RulesEngine): Outcome | null {
    if (engine.checkmate())
      return { winner: opposite(engine.turn()), reason: "mate" };
    if (engine.stalemate()) return { winner: null, reason: "stalemate" };
    if (isDead(engine)) return { winner: null, reason: "dead" };
    if (engine.repetitions() >= 5) return { winner: null, reason: "fivefold" };
    if (engine.halfmoves() >= 150)
      return { winner: null, reason: "seventyfive" };
    return null;
  }
  claims(engine: RulesEngine): ClaimReason[] {
    const claims: ClaimReason[] = [];
    if (engine.repetitions() >= 3) claims.push("threefold");
    if (engine.halfmoves() >= 100) claims.push("fifty");
    return claims;
  }
  prospective(
    engine: RulesEngine,
  ): { move: MoveInput; san: string; reasons: ClaimReason[] }[] {
    return engine.legalMoves().flatMap((m) => {
      const move: MoveInput = {
        from: m.from,
        to: m.to,
        ...(m.promotion
          ? { promotion: m.promotion as MoveInput["promotion"] }
          : {}),
      };
      const copy = engine.clone();
      copy.move(move);
      const reasons = this.claims(copy);
      return reasons.length ? [{ move, san: m.san, reasons }] : [];
    });
  }
  claim(engine: RulesEngine, reason: ClaimReason, move?: MoveInput): Outcome {
    const copy = engine.clone();
    if (move) copy.move(move);
    if (!this.claims(copy).includes(reason))
      throw new Error("Reclamación no válida");
    return { winner: null, reason, ...(move ? { declaredMove: move } : {}) };
  }
  resign(engine: RulesEngine, color: Color): Outcome {
    return {
      winner: canPossiblyMate(engine, opposite(color)) ? opposite(color) : null,
      reason: "resignation",
    };
  }
}
