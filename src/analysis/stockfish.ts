import { Chess } from "chess.js";
import type { Color, Promotion, Square } from "../domain/types";
import type { AnalysisEngine, AnalysisLine, AnalysisRequest } from "./contract";

const ENGINE_URL = "/analysis/stockfish/stockfish-19-lite-single.js";
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const MAX_DEPTH = 24;
const MAX_TIME_MS = 15_000;

type Search = {
  request: AnalysisRequest;
  scorePerspective: Color;
  onInfo: (line: AnalysisLine) => void;
  resolve: (result: { requestId: string; bestMoveUci: string | null }) => void;
};

/** Lazy, single-threaded Stockfish WASM transport. UCI searches are drained
 * through bestmove before another request is allowed to use the worker. */
export class StockfishEngine implements AnalysisEngine {
  private worker: Worker | null = null;
  private search: Search | null = null;
  private initialized: Promise<{ name: string; version: string }> | null = null;
  private initResolve: ((value: { name: string; version: string }) => void) | null = null;
  private initReject: ((reason: Error) => void) | null = null;
  private readyResolve: (() => void) | null = null;
  private engineName = "Stockfish";

  initialize() {
    if (this.initialized) return this.initialized;
    this.initialized = new Promise((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
      try {
        this.worker = new Worker(ENGINE_URL);
        this.worker.onmessage = (event: MessageEvent<string>) => this.onMessage(String(event.data));
        this.worker.onerror = () => this.fail(new Error("No se pudo cargar el motor de análisis."));
        this.worker.postMessage("uci");
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error("No se pudo iniciar Stockfish."));
      }
      window.setTimeout(() => {
        if (this.initReject) this.fail(new Error("Stockfish tardó demasiado en iniciar."));
      }, 20_000);
    });
    return this.initialized;
  }

  private onMessage(message: string) {
    const line = message.trim();
    if (line.startsWith("id name ")) this.engineName = line.slice(8);
    if (line === "uciok") {
      this.initResolve?.({ name: this.engineName, version: "19 lite" });
      this.initResolve = null;
      this.initReject = null;
      this.worker?.postMessage("setoption name Hash value 16");
      return;
    }
    if (line === "readyok") {
      this.readyResolve?.();
      this.readyResolve = null;
      return;
    }
    if (line.startsWith("info ") && this.search) {
      const parsed = parseInfo(line, this.search.request, this.search.scorePerspective);
      if (parsed) this.search.onInfo(parsed);
      return;
    }
    if (line.startsWith("bestmove ") && this.search) {
      const active = this.search;
      this.search = null;
      const move = line.split(/\s+/)[1];
      active.resolve({ requestId: active.request.requestId, bestMoveUci: move && move !== "(none)" ? move : null });
    }
  }

  async analyze(request: AnalysisRequest, onInfo: (line: AnalysisLine) => void) {
    const worker = this.worker;
    if (!worker) throw new Error("Inicializa el motor antes de analizar.");
    await this.initialize();
    if (this.search) await this.stop();
    const position = new Chess(request.initialFen);
    for (const move of request.movesUci) {
      if (!UCI_MOVE.test(move)) throw new Error("El historial contiene una jugada UCI inválida.");
      position.move(uciInput(move));
    }
    const scorePerspective = position.turn();
    if (!Number.isInteger(request.multiPv) || request.multiPv < 1 || request.multiPv > 3) throw new Error("El número de variantes debe estar entre 1 y 3.");
    const limit = request.limit.kind === "depth"
      ? `go depth ${bounded(request.limit.value, 1, MAX_DEPTH)}`
      : `go movetime ${bounded(request.limit.value, 100, MAX_TIME_MS)}`;
    worker.postMessage(`setoption name MultiPV value ${request.multiPv}`);
    await new Promise<void>((resolve) => {
      this.readyResolve = resolve;
      worker.postMessage("isready");
    });
    worker.postMessage(`position fen ${request.initialFen}${request.movesUci.length ? ` moves ${request.movesUci.join(" ")}` : ""}`);
    const result = new Promise<{ requestId: string; bestMoveUci: string | null }>((resolve) => {
      this.search = { request, scorePerspective, onInfo, resolve };
    });
    worker.postMessage(limit);
    return result;
  }

  async stop() {
    if (!this.search || !this.worker) return;
    const finished = new Promise<void>((resolve) => {
      const active = this.search!;
      const original = active.resolve;
      active.resolve = (result) => { original(result); resolve(); };
    });
    this.worker.postMessage("stop");
    await finished;
  }

  async dispose() {
    await this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.initialized = null;
  }

  private fail(error: Error) {
    this.initReject?.(error);
    this.initReject = null;
    if (this.search) {
      const active = this.search;
      this.search = null;
      active.resolve({ requestId: active.request.requestId, bestMoveUci: null });
    }
  }
}

function bounded(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new Error("Límite de análisis inválido.");
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function parseInfo(line: string, request: AnalysisRequest, scorePerspective: Color): AnalysisLine | null {
  const depth = Number(line.match(/\bdepth (\d+)/)?.[1]);
  const multiPv = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
  const score = line.match(/\bscore (cp|mate) (-?\d+)(?: (lowerbound|upperbound))?/);
  const pv = line.match(/\bpv (.+)$/)?.[1]?.trim().split(/\s+/) ?? [];
  if (!Number.isInteger(depth) || !score || !pv.length || !pv.every((move) => UCI_MOVE.test(move))) return null;
  return {
    requestId: request.requestId,
    depth,
    multipv: multiPv,
    score: { kind: score[1] as "cp" | "mate", value: Number(score[2]) },
    scorePerspective,
    ...(score[3] ? { bound: score[3] === "lowerbound" ? "lower" as const : "upper" as const } : {}),
    pvUci: pv,
  };
}

function uciInput(move: string) {
  return {
    from: move.slice(0, 2) as Square,
    to: move.slice(2, 4) as Square,
    ...(move.length === 5 ? { promotion: move[4] as Promotion } : {}),
  };
}
