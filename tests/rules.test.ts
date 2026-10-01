import { describe, expect, it } from "vitest";
import { RulesEngine } from "../src/domain/rules";
import { Game } from "../src/domain/game";
import {
  OutcomeService,
  canPossiblyMate,
  closedPawnWall,
} from "../src/domain/outcomes";
import type { MoveInput, Promotion } from "../src/domain/types";
const policy = new OutcomeService();
const input = (uci: string): MoveInput => ({
  from: uci.slice(0, 2) as MoveInput["from"],
  to: uci.slice(2, 4) as MoveInput["to"],
  ...(uci[4] ? { promotion: uci[4] as Promotion } : {}),
});
function sequence(engine: RulesEngine, moves: string[]) {
  moves.forEach((m) => engine.move(input(m)));
}
const cycle = ["g1f3", "g8f6", "f3g1", "f6g8"];
describe("motor legal chess.js 1.4.0", () => {
  it("posición estándar: 32 piezas, blancas y 20 movimientos", () => {
    const e = new RulesEngine();
    expect(e.pieces()).toHaveLength(32);
    expect(e.turn()).toBe("w");
    expect(e.legalMoves()).toHaveLength(20);
  });
  it("no permite movimientos que expongan al rey ni capturas de rey", () => {
    const e = new RulesEngine("4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1");
    const before = e.fen();
    expect(() => e.move(input("e2d2"))).toThrow();
    expect(e.fen()).toBe(before);
    expect(e.legalMoves().every((m) => m.captured !== "k")).toBe(true);
  });
  it("al paso legal retira d5; expone al rey es ilegal y normaliza FEN", () => {
    const e = new RulesEngine("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
    expect(e.fen().split(" ")[3]).toBe("d6");
    e.move(input("e5d6"));
    expect(e.get("d5")).toBeUndefined();
    expect(e.get("d6")?.color).toBe("w");
    expect(e.halfmoves()).toBe(0);
    const pinned = new RulesEngine("7k/8/8/r4pPK/8/8/8/8 w - f6 0 2");
    expect(() => pinned.move(input("g5f6"))).toThrow();
    expect(pinned.fen().split(" ")[3]).toBe("-");
  });
  it("captura al paso caduca tras otra jugada y funciona para negras", () => {
    const e = new RulesEngine("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
    sequence(e, ["e1f1", "e8f8"]);
    expect(() => e.move(input("e5d6"))).toThrow();
    const black = new RulesEngine("4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 2");
    black.move(input("e4d3"));
    expect(black.get("d4")).toBeUndefined();
  });
  it.each(["e1g1", "e1c1"])("enroque blanco %s mueve rey y torre", (uci) => {
    const e = new RulesEngine("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    e.move(input(uci));
    expect(e.get(uci.endsWith("g1") ? "f1" : "d1")?.type).toBe("r");
    expect(e.get("e1")).toBeUndefined();
  });
  it.each(["e8g8", "e8c8"])("enroque negro %s", (uci) => {
    const e = new RulesEngine("r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1");
    e.move(input(uci));
    expect(e.get(uci.endsWith("g8") ? "f8" : "d8")?.type).toBe("r");
  });
  it("no enroca por ataque, sí aunque b1 esté atacada", () => {
    expect(() =>
      new RulesEngine("4kr2/8/8/8/8/8/8/4K2R w K - 0 1").move(input("e1g1")),
    ).toThrow();
    expect(() =>
      new RulesEngine("1r2k3/8/8/8/8/8/8/R3K3 w Q - 0 1").move(input("e1c1")),
    ).not.toThrow();
  });
  it("volver con rey o torre no recupera derechos", () => {
    const e = new RulesEngine("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    sequence(e, ["h1h2", "e8e7", "h2h1", "e7e8"]);
    expect(e.fen().split(" ")[2]).toBe("Q");
    sequence(e, ["e1e2", "e8e7", "e2e1", "e7e8"]);
    expect(e.fen().split(" ")[2]).toBe("-");
  });
  it.each(["q", "r", "b", "n"] as Promotion[])(
    "promoción %s completa, mismo color, sin turno parcial",
    (promotion) => {
      const e = new RulesEngine("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
      expect(() => e.move(input("a7a8"))).toThrow();
      expect(e.turn()).toBe("w");
      expect(e.get("a7")?.type).toBe("p");
      e.move({ from: "a7", to: "a8", promotion });
      expect(e.get("a8")).toMatchObject({ type: promotion, color: "w" });
      expect(e.turn()).toBe("b");
    },
  );
  it("captura y subpromoción negras", () => {
    const e = new RulesEngine("4k3/8/8/8/8/8/1p6/R3K3 b - - 0 1");
    e.move(input("b2a1n"));
    expect(e.get("a1")).toMatchObject({ type: "n", color: "b" });
    expect(e.halfmoves()).toBe(0);
  });
  it("peón bloqueado no avanza ni captura de frente", () => {
    const e = new RulesEngine("4k3/8/8/8/8/4n3/4P3/4K3 w - - 0 1");
    expect(e.legalMoves("e2")).toHaveLength(0);
  });
  it("jaque doble solo admite movimientos del rey", () => {
    const e = new RulesEngine("4r1k1/8/8/8/1b6/8/R7/4K3 w - - 0 1");
    expect(e.check()).toBe(true);
    expect(e.legalMoves().every((m) => m.piece === "k")).toBe(true);
  });
  it("reyes no pueden acercarse a casillas adyacentes", () => {
    const e = new RulesEngine("8/8/8/8/8/4k3/8/4K3 w - - 0 1");
    expect(() => e.move(input("e1e2"))).toThrow();
  });
});
describe("política explícita de resultados", () => {
  it("mate y ahogado", () => {
    expect(
      policy.automatic(new RulesEngine("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")),
    ).toEqual({ winner: "w", reason: "mate" });
    expect(
      policy.automatic(new RulesEngine("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")),
    ).toEqual({ winner: null, reason: "stalemate" });
  });
  it("tercera repetición reclamable y quinta automática; inicio cuenta", () => {
    const e = new RulesEngine();
    sequence(e, [...cycle, ...cycle]);
    expect(e.repetitions()).toBe(3);
    expect(policy.claims(e)).toContain("threefold");
    expect(policy.automatic(e)).toBeNull();
    sequence(e, [...cycle, ...cycle]);
    expect(e.repetitions()).toBe(5);
    expect(policy.automatic(e)?.reason).toBe("fivefold");
  });
  it("reclamación prevista de repetición no ejecuta la jugada", () => {
    const game = new Game();
    [...cycle, ...cycle.slice(0, 3)].forEach((m) => game.play(input(m)));
    const before = game.rules.fen();
    game.claim("threefold", input("f6g8"));
    expect(game.rules.fen()).toBe(before);
    expect(game.rules.history()).toHaveLength(7);
    expect(game.result?.declaredMove).toEqual(input("f6g8"));
  });
  it("50 por jugada prevista; 100 no es automático", () => {
    const e = new RulesEngine("7k/8/8/8/8/8/R7/K7 w - - 99 50");
    const before = e.fen();
    expect(policy.claim(e, "fifty", input("a2a3")).reason).toBe("fifty");
    expect(e.fen()).toBe(before);
    expect(policy.prospective(e).some((c) => c.move.to === "a3")).toBe(true);
    e.move(input("a2a3"));
    expect(e.halfmoves()).toBe(100);
    expect(policy.automatic(e)).toBeNull();
  });
  it("75 automático, con prioridad del mate", () => {
    const e = new RulesEngine("7k/8/8/8/8/8/R7/K7 w - - 149 75");
    e.move(input("a2a3"));
    expect(policy.automatic(e)?.reason).toBe("seventyfive");
    const mate = new RulesEngine("7k/8/5K2/6Q1/8/8/8/8 w - - 149 75");
    mate.move(input("g5g7"));
    expect(mate.halfmoves()).toBe(150);
    expect(policy.automatic(mate)?.reason).toBe("mate");
  });
  it("rechaza reclamación falsa sin alterar estado", () => {
    const e = new RulesEngine();
    expect(() => policy.claim(e, "fifty", input("e2e4"))).toThrow();
    expect(e.history()).toHaveLength(0);
  });
  it.each([
    "7k/8/8/8/8/8/8/K7 w - - 0 1",
    "7k/8/8/8/8/8/8/KB6 w - - 0 1",
    "7k/8/8/8/8/8/8/KN6 w - - 0 1",
  ])("material muerto conocido: %s", (fen) => {
    expect(policy.automatic(new RulesEngine(fen))?.reason).toBe("dead");
  });
  it("dos caballos no son posición muerta; mate cooperativo posible", () => {
    const e = new RulesEngine("7k/8/8/8/8/8/8/KNN5 w - - 0 1");
    expect(policy.automatic(e)).toBeNull();
    expect(canPossiblyMate(e, "w")).toBe(true);
  });
  it("rendición contra rey solo es tablas", () => {
    const e = new RulesEngine("7k/8/8/8/8/8/R7/K7 w - - 0 1");
    expect(policy.resign(e, "w")).toEqual({
      reason: "resignation",
      winner: null,
    });
  });
  it("mismo color de alfiles es muerto, colores opuestos pueden colaborar", () => {
    expect(
      policy.automatic(new RulesEngine("7k/8/8/8/8/4b3/8/K1B5 w - - 0 1"))
        ?.reason,
    ).toBe("dead");
    expect(
      canPossiblyMate(new RulesEngine("7k/8/8/8/8/3b4/8/K1B5 w - - 0 1"), "w"),
    ).toBe(true);
  });
  it("demuestra un bloqueo muerto de peones, no confunde un bloqueo rompible", () => {
    const wall = new RulesEngine("7k/8/8/p1p1p1p1/P1P1P1P1/8/8/K7 w - - 0 1");
    expect(closedPawnWall(wall)).toBe(true);
    expect(policy.automatic(wall)?.reason).toBe("dead");
    expect(
      closedPawnWall(new RulesEngine("7k/8/8/p7/P7/8/8/K7 w - - 0 1")),
    ).toBe(false);
  });
  it("oferta después de ambas jugadas, aceptación y rechazo al mover", () => {
    const game = new Game();
    expect(() => game.offerDraw()).toThrow();
    game.play(input("e2e4"));
    expect(() => game.offerDraw()).toThrow();
    game.play(input("e7e5"));
    game.offerDraw();
    game.play(input("g1f3"));
    expect(game.offer).toBe("w");
    game.play(input("g8f6"));
    expect(game.offer).toBeNull();
    game.offerDraw();
    game.acceptDraw();
    expect(game.result?.reason).toBe("agreement");
    expect(() => game.play(input("b1c3"))).toThrow();
  });
});
