import { expect, it } from "vitest";
import {
  AnalysisCoordinator,
  type AnalysisEngine,
  type AnalysisLine,
  type AnalysisRequest,
} from "../src/analysis/contract";
it("cancela búsquedas y descarta resultados obsoletos sin acoplar el juego", async () => {
  let emit: (line: AnalysisLine) => void = () => undefined;
  let finish: (v: {
    requestId: string;
    bestMoveUci: string | null;
  }) => void = () => undefined;
  let stops = 0;
  const engine: AnalysisEngine = {
    initialize: async () => ({ name: "test transport", version: "test" }),
    analyze: async (_request, onInfo) => {
      emit = onInfo;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    stop: async () => {
      stops++;
    },
    dispose: async () => undefined,
  };
  const coordinator = new AnalysisCoordinator(engine),
    received: AnalysisLine[] = [];
  const request: AnalysisRequest = {
    requestId: "one",
    initialFen: "",
    movesUci: [],
    limit: { kind: "depth", value: 1 },
    multiPv: 1,
  };
  const running = coordinator.analyze(request, (line) => received.push(line));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await coordinator.cancel();
  emit({
    requestId: "one",
    depth: 1,
    multipv: 1,
    score: { kind: "cp", value: 1 },
    scorePerspective: "w",
    pvUci: [],
  });
  finish({ requestId: "one", bestMoveUci: "e2e4" });
  expect(await running).toBeNull();
  expect(received).toHaveLength(0);
  expect(stops).toBeGreaterThanOrEqual(2);
});
