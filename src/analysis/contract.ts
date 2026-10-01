import type { Color } from "../domain/types";
export type AnalysisRequest = {
  requestId: string;
  initialFen: string;
  movesUci: string[];
  limit: { kind: "depth" | "movetime"; value: number };
  multiPv: number;
};
export type AnalysisLine = {
  requestId: string;
  depth: number;
  multipv: number;
  score: { kind: "cp" | "mate"; value: number };
  scorePerspective: Color;
  bound?: "lower" | "upper";
  pvUci: string[];
};
export interface AnalysisEngine {
  initialize(): Promise<{ name: string; version: string }>;
  analyze(
    request: AnalysisRequest,
    onInfo: (line: AnalysisLine) => void,
  ): Promise<{ requestId: string; bestMoveUci: string | null }>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}
/** Serializes cancellation. A future UCI transport must drain bestmove before
 * stop() resolves, since UCI itself carries no request IDs. */
export class AnalysisCoordinator {
  private generation = 0;
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private readonly engine: AnalysisEngine) {}
  async analyze(
    request: AnalysisRequest,
    onInfo: (line: AnalysisLine) => void,
  ) {
    const generation = ++this.generation;
    const ready = this.serial.then(() => this.engine.stop());
    this.serial = ready.catch(() => undefined);
    await ready;
    if (generation !== this.generation) return null;
    const result = await this.engine.analyze(request, (line) => {
      if (
        generation === this.generation &&
        line.requestId === request.requestId
      )
        onInfo(line);
    });
    return generation === this.generation &&
      result.requestId === request.requestId
      ? result
      : null;
  }
  async cancel() {
    ++this.generation;
    await this.engine.stop();
  }
  async dispose() {
    await this.cancel();
    await this.engine.dispose();
  }
}
