import { describe, expect, it } from "vitest";
import { normalizeRoomCode, invitationUrl, ROOM_ALPHABET } from "../src/online/roomCode";
import { cleanUsername, authError } from "../src/online/auth";
import { onlineError } from "../src/online/errors";
import { parseAction } from "../supabase/functions/_shared/authority";

describe("online input boundaries", () => {
  it("normalizes only six unambiguous room characters", () => {
    expect(normalizeRoomCode(" x7k9p2 ")).toBe("X7K9P2");
    for (const invalid of ["", "ABC", "ABCDEF7", "A0CDEF", "AOCDIF", "<html>", "../../"])
      expect(normalizeRoomCode(invalid)).toBeNull();
    expect(ROOM_ALPHABET).not.toMatch(/[OI01]/);
  });
  it("uses the actual origin without preserving unrelated paths or query parameters", () => {
    expect(invitationUrl("https://ajedrez-educativo-tematico.vercel.app", normalizeRoomCode("X7K9P2")!))
      .toBe("https://ajedrez-educativo-tematico.vercel.app/?room=X7K9P2");
    expect(invitationUrl("http://localhost:5173", normalizeRoomCode("X7K9P2")!))
      .toBe("http://localhost:5173/?room=X7K9P2");
  });
  it("nicknames cannot expose email or markup", () => {
    expect(cleanUsername("  Bolivar_23  ")).toBe("Bolivar_23");
    for (const invalid of ["ab", "a".repeat(25), "player@example.com", "<script>", "two names"])
      expect(cleanUsername(invalid)).toBeNull();
  });
  it("never reflects internal errors", () => {
    expect(onlineError(new Error("SQLSTATE private-token"))).not.toContain("SQLSTATE");
    expect(authError(new Error("JWT password internal"))).not.toContain("JWT");
    expect(onlineError(new Error("STALE_STATE"))).toContain("actualizado");
  });
  it("rejects malformed action envelopes and promotions", () => {
    const valid = { gameId: "11111111-1111-4111-8111-111111111111", expectedPly: 0, expectedRevision: 1, action: { type: "move", move: { from: "e2", to: "e4" } } };
    expect(parseAction(valid)).toEqual(valid);
    for (const value of [null, {}, { ...valid, expectedPly: -1 }, { ...valid, expectedRevision: 1.5 },
      { ...valid, action: { type: "move", move: { from: "e2", to: "e4", promotion: "k" } } },
      { ...valid, action: { type: "set-fen" } }]) expect(() => parseAction(value)).toThrow("INVALID_INPUT");
  });
});
