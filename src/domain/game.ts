import { DEFAULT_POSITION } from "chess.js";
import { RulesEngine } from "./rules";
import { OutcomeService } from "./outcomes";
import {
  opposite,
  type ClaimReason,
  type Color,
  type MoveInput,
  type Outcome,
  type TeamAssignment,
} from "./types";

export class Game {
  readonly rules: RulesEngine;
  readonly outcomes = new OutcomeService();
  result: Outcome | null = null;
  offer: Color | null = null;
  constructor(
    readonly teams: TeamAssignment = { w: "libertadores", b: "realistas" },
    initialFen = DEFAULT_POSITION,
  ) {
    this.rules = new RulesEngine(initialFen);
    this.result = this.outcomes.automatic(this.rules);
  }
  private assertActive() {
    if (this.result) throw new Error("La partida ya terminó");
  }
  play(move: MoveInput) {
    this.assertActive();
    const player = this.rules.turn();
    this.rules.move(move);
    if (this.offer === opposite(player)) this.offer = null;
    this.result = this.outcomes.automatic(this.rules);
    if (this.result) this.offer = null;
  }
  offerDraw() {
    this.assertActive();
    if (this.rules.history().length < 2 || this.offer)
      throw new Error(
        "La oferta requiere una jugada de cada jugador y ninguna oferta pendiente",
      );
    this.offer = this.rules.turn();
  }
  acceptDraw() {
    this.assertActive();
    if (!this.offer || this.rules.history().length < 2)
      throw new Error("No hay oferta pendiente");
    this.result = { winner: null, reason: "agreement" };
    this.offer = null;
  }
  rejectDraw() {
    this.assertActive();
    this.offer = null;
  }
  claim(reason: ClaimReason, move?: MoveInput) {
    this.assertActive();
    this.result = this.outcomes.claim(this.rules, reason, move);
    this.offer = null;
  }
  resign() {
    this.assertActive();
    this.result = this.outcomes.resign(this.rules, this.rules.turn());
    this.offer = null;
  }
}
