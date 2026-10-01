import { describe, expect, it } from "vitest";
import { Game } from "../src/domain/game";
import { restoreGame, serializeGame } from "../src/persistence";
import { defaults } from "../src/preferences";
import { teams } from "../src/data/catalog";
import type { MoveInput } from "../src/domain/types";
const cycle: MoveInput[] = [
  { from: "g1", to: "f3" },
  { from: "g8", to: "f6" },
  { from: "f3", to: "g1" },
  { from: "f6", to: "g8" },
];
describe("guardados versionados y presentación independiente", () => {
  it("restaura la historia y las repeticiones, no solamente el FEN", () => {
    const game = new Game();
    [...cycle, ...cycle].forEach((m) => game.play(m));
    const restored = restoreGame(
      JSON.stringify(serializeGame(game, defaults)),
    ).game;
    expect(restored.rules.fen()).toBe(game.rules.fen());
    expect(restored.rules.repetitions()).toBe(3);
    expect(restored.rules.inputs()).toEqual(game.rules.inputs());
    expect(restored.result).toBeNull();
  });
  it("guarda orientación, tema, colores y escala sin tocar el estado legal", () => {
    const game = new Game({ w: "realistas", b: "libertadores" });
    game.play({ from: "e2", to: "e4" });
    const fen = game.rules.fen(),
      moves = game.rules.inputs();
    const prefs = {
      ...defaults,
      themeId: "pizarra",
      orientation: "b" as const,
      light: "#ffddaa",
      scale: 0.94,
    };
    const restored = restoreGame(JSON.stringify(serializeGame(game, prefs)));
    expect(restored.preferences).toEqual(prefs);
    expect(restored.game.rules.fen()).toBe(fen);
    expect(restored.game.rules.inputs()).toEqual(moves);
    expect(restored.game.teams.w).toBe("realistas");
  });
  it("restaura promoción y conserva equipo/color", () => {
    const game = new Game(
      { w: "realistas", b: "libertadores" },
      "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
    );
    game.play({ from: "a7", to: "a8", promotion: "q" });
    const restored = restoreGame(
      JSON.stringify(serializeGame(game, defaults)),
    ).game;
    const piece = restored.rules.get("a8")!;
    expect(piece).toMatchObject({ type: "q", color: "w" });
    expect(
      teams[restored.teams[piece.color]].pieces[piece.type].assets[piece.color]
        .src,
    ).toContain("D-B-R.png");
  });
  it("restaura reclamación prevista sin agregar movimiento", () => {
    const game = new Game();
    [...cycle, ...cycle.slice(0, 3)].forEach((m) => game.play(m));
    game.claim("threefold", cycle[3]);
    const restored = restoreGame(
      JSON.stringify(serializeGame(game, defaults)),
    ).game;
    expect(restored.rules.history()).toHaveLength(7);
    expect(restored.result).toEqual(game.result);
  });
  it("preserva oferta pendiente y pérdida de derechos de enroque", () => {
    const game = new Game(undefined, "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    game.play({ from: "h1", to: "h2" });
    game.play({ from: "e8", to: "e7" });
    game.offerDraw();
    const restored = restoreGame(
      JSON.stringify(serializeGame(game, defaults)),
    ).game;
    expect(restored.offer).toBe("w");
    expect(restored.rules.fen().split(" ")[2]).toBe("Q");
  });
  it("rechaza versiones, JSON, equipos, movimientos y resultados corruptos", () => {
    const save = serializeGame(new Game(), defaults);
    for (const raw of [
      "{",
      JSON.stringify({ ...save, version: 2 }),
      JSON.stringify({ ...save, teams: { w: "missing", b: "realistas" } }),
      JSON.stringify({ ...save, moves: [{ from: "e2", to: "e5" }] }),
      JSON.stringify({ ...save, result: { winner: "w", reason: "mate" } }),
      JSON.stringify({ ...save, preferences: { ...defaults, scale: 2 } }),
    ])
      expect(() => restoreGame(raw)).toThrow();
  });
  it("no acepta jugadas después del resultado automático", () => {
    const game = new Game();
    [...cycle, ...cycle, ...cycle, ...cycle].forEach((m) => game.play(m));
    const save = serializeGame(game, defaults);
    save.moves.push(cycle[0]);
    expect(() => restoreGame(JSON.stringify(save))).toThrow();
  });
});
