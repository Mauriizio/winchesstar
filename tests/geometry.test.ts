import { describe, expect, it } from "vitest";
import {
  displayToSquare,
  isDarkSquare,
  squares,
  squareToDisplay,
} from "../src/board/geometry";
describe("geometría SVG canónica", () => {
  it("64 identidades únicas y 128 conversiones inversas", () => {
    expect(new Set(squares).size).toBe(64);
    for (const view of ["w", "b"] as const)
      for (const square of squares) {
        const { row, col } = squareToDisplay(square, view);
        expect(displayToSquare(row, col, view)).toBe(square);
        expect(col * 100).toBeGreaterThanOrEqual(0);
        expect(row * 100 + 100).toBeLessThanOrEqual(800);
      }
  });
  it("esquinas, e4 y colores independientes de orientación", () => {
    expect(squareToDisplay("a8", "w")).toEqual({ row: 0, col: 0 });
    expect(squareToDisplay("h1", "b")).toEqual({ row: 0, col: 0 });
    expect(squareToDisplay("e4", "w")).toEqual({ row: 4, col: 4 });
    expect(squareToDisplay("e4", "b")).toEqual({ row: 3, col: 3 });
    expect(isDarkSquare("a1")).toBe(true);
    expect(isDarkSquare("h1")).toBe(false);
  });
  it("rechaza coordenadas inválidas", () => {
    expect(() => displayToSquare(-1, 0, "w")).toThrow();
    expect(() => displayToSquare(0, 8, "b")).toThrow();
  });
});
