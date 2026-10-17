import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import type { Game } from "../domain/game";
import { roleNames } from "../domain/types";
import { AnalysisCoordinator, type AnalysisLine } from "../analysis/contract";
import { StockfishEngine } from "../analysis/stockfish";

type PositionEvaluation = {
  whiteCp: number;
  bestMove: string | null;
  alternatives: number[];
};
type MoveReview = {
  ply: number;
  from: Square;
  to: Square;
  san: string;
  grade: "brilliant" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
  symbol: string;
  lossCp: number;
  comment: string;
};
const gradeNames: Record<MoveReview["grade"], string> = {
  brilliant: "Brillante",
  best: "Mejor jugada",
  excellent: "Excelente",
  good: "Buena",
  inaccuracy: "Imprecisión",
  mistake: "Error",
  blunder: "Error grave",
};
const moveSymbols: Record<MoveReview["grade"], string> = {
  brilliant: "!!",
  best: "✓",
  excellent: "!",
  good: "",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

export function AnalysisPanel({ game, onPositionChange, onEvaluationChange, onMoveMarkerChange }: {
  game: Game;
  onPositionChange: (ply: number | null) => void;
  onEvaluationChange: (score: number | null) => void;
  onMoveMarkerChange: (marker: { square: Square; symbol: string; label: string; grade: MoveReview["grade"] } | null) => void;
}) {
  const [analysis] = useState(() => {
    const engine = new StockfishEngine();
    return { engine, coordinator: new AnalysisCoordinator(engine) };
  });
  const cancelled = useRef(false);
  const [evaluations, setEvaluations] = useState<PositionEvaluation[]>([]);
  const [moves, setMoves] = useState<MoveReview[]>([]);
  const [selectedPly, setSelectedPly] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineName, setEngineName] = useState<string | null>(null);
  const totalPlies = game.rules.history().length;

  useEffect(() => () => {
    cancelled.current = true;
    void analysis.coordinator.dispose();
  }, [analysis]);

  async function analyzeGame() {
    setPlaying(false);
    cancelled.current = false;
    setBusy(true);
    setComplete(false);
    setError(null);
    setEvaluations([]);
    setMoves([]);
    setSelectedPly(0);
    onPositionChange(0);
    const inputs = game.rules.inputs();
    const history = game.rules.history();
    const collected: PositionEvaluation[] = [];
    const reviews: MoveReview[] = [];
    setProgress({ done: 0, total: inputs.length + 1 });
    try {
      const engine = await analysis.engine.initialize();
      setEngineName(`${engine.name} ${engine.version}`);
      for (let ply = 0; ply <= inputs.length; ply++) {
        if (cancelled.current) break;
        const recent = new Map<number, AnalysisLine>();
        const result = await analysis.coordinator.analyze({
          requestId: crypto.randomUUID(),
          initialFen: game.rules.initialFen,
          movesUci: inputs.slice(0, ply).map((move) => move.from + move.to + (move.promotion ?? "")),
          limit: { kind: "movetime", value: 300 },
          multiPv: 2,
        }, (line) => recent.set(line.multipv, line));
        if (cancelled.current || !result) break;
        const primary = recent.get(1);
        const next: PositionEvaluation = {
          whiteCp: primary ? toWhiteCentipawns(primary) : terminalWhiteScore(game, ply, inputs.length),
          bestMove: result.bestMoveUci ?? primary?.pvUci[0] ?? null,
          alternatives: [...recent.values()].map(toWhiteCentipawns),
        };
        collected.push(next);
        setEvaluations([...collected]);
        setProgress({ done: ply + 1, total: inputs.length + 1 });
        if (ply > 0) {
          const review = reviewMove(history[ply - 1], ply, collected[ply - 1], next);
          reviews.push(review);
          setMoves([...reviews]);
        }
      }
      const finished = !cancelled.current && collected.length === inputs.length + 1;
      setComplete(finished);
      if (finished) {
        setSelectedPly(inputs.length);
        onPositionChange(inputs.length);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo revisar la partida.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelReview() {
    setPlaying(false);
    cancelled.current = true;
    await analysis.coordinator.cancel();
  }

  const selectPly = useCallback((ply: number) => {
    setSelectedPly(ply);
    onPositionChange(ply);
  }, [onPositionChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        setPlaying(false);
        selectPly(Math.max(0, selectedPly - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        setPlaying(false);
        selectPly(Math.min(evaluations.length ? evaluations.length - 1 : totalPlies, selectedPly + 1));
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [evaluations.length, selectedPly, selectPly, totalPlies]);

  useEffect(() => {
    if (!playing) return;
    if (selectedPly >= totalPlies) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => selectPly(selectedPly + 1), 700);
    return () => window.clearTimeout(timer);
  }, [playing, selectedPly, totalPlies, selectPly]);

  const currentEvaluation = evaluations[selectedPly];
  const selectedMove = moves.find((move) => move.ply === selectedPly);
  useEffect(() => {
    onMoveMarkerChange(selectedMove ? { square: selectedMove.to, symbol: selectedMove.symbol || "·", label: gradeNames[selectedMove.grade], grade: selectedMove.grade } : null);
  }, [onMoveMarkerChange, selectedMove]);
  const whitePercent = currentEvaluation ? scoreToWhitePercent(currentEvaluation.whiteCp) : 50;
  const currentComment = selectedPly > 0 ? moves[selectedPly - 1]?.comment : null;

  useEffect(() => {
    onEvaluationChange(currentEvaluation?.whiteCp ?? null);
  }, [currentEvaluation, onEvaluationChange]);

  return (
    <section className="analysis-panel" aria-label="Análisis y revisión de partida">
      <div className="panel-heading">
        <div>
          <h3>Revisión de la partida</h3>
          <span>Recorre cada jugada, su evaluación y sugerencias del tutor.</span>
        </div>
        <button className="secondary" disabled={busy} onClick={() => void analyzeGame()}>
          {busy ? "Analizando…" : complete || moves.length ? "Analizar de nuevo" : "Analizar partida"}
        </button>
      </div>

      {busy ? (
        <div className="analysis-progress">
          <p role="status">Evaluando posición {progress.done} de {progress.total}…</p>
          <progress max={progress.total || 1} value={progress.done} aria-label="Progreso del análisis" />
          <button className="text-button" onClick={() => void cancelReview()}>Detener análisis</button>
        </div>
      ) : null}
      {engineName ? <p className="small">{engineName} · análisis local · 0,3 s por posición</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!busy && !complete && moves.length ? <p className="small">Revisión parcial: se detuvo antes de evaluar todas las jugadas.</p> : null}

      {evaluations.length ? (
        <div className="review-current">
          <div className="review-current-body">
            <div className="review-nav">
              <strong>{selectedPly === 0 ? "Posición inicial" : `Jugada ${Math.ceil(selectedPly / 2)} · ${selectedPly % 2 ? "blancas" : "negras"}`}</strong>
            </div>
            <div className="review-score">
              <span>{currentEvaluation.whiteCp > 0 ? "+" : ""}{(currentEvaluation.whiteCp / 100).toFixed(2)}</span>
              <span>{whitePercent >= 50 ? "Ventaja blanca" : "Ventaja negra"}</span>
            </div>
            {currentComment ? <p className="tutor-comment"><strong>Tutor:</strong> {currentComment}</p> : <p className="tutor-comment"><strong>Tutor:</strong> Observa el plan de ambos bandos; revisa cómo cambia la evaluación tras cada jugada.</p>}
          </div>
        </div>
      ) : null}

      {moves.length ? (
        <div className="review-list-wrap">
          <h4>Jugadas y comentarios</h4>
          <ol className="review-moves">
            {moves.map((move) => (
              <li key={move.ply}>
                <button className={`review-move ${selectedPly === move.ply ? "is-selected" : ""}`} onClick={() => selectPly(move.ply)} aria-current={selectedPly === move.ply ? "step" : undefined}>
                  <span className="review-move-number">{Math.ceil(move.ply / 2)}{move.ply % 2 ? "." : "…"}</span>
                  <span className="review-move-san">{move.san}</span>
                  <strong className={`grade-${move.grade}`}>{move.symbol || "·"}</strong>
                  <span className="review-grade-name">{gradeNames[move.grade]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {evaluations.length > 1 ? <div className="review-chart" aria-label="Gráfico de evaluación de la partida">
        <svg viewBox="0 0 600 80" preserveAspectRatio="none" role="img" aria-label="La línea sube a favor de las blancas y baja a favor de las negras">
          <rect width="600" height="80" rx="4" fill="#eeeae0" />
          <line x1="0" y1="40" x2="600" y2="40" stroke="#b7b6ad" strokeWidth="1" />
          <polyline points={evaluations.map((evaluation, index) => {
            const x = evaluations.length === 1 ? 300 : index / (evaluations.length - 1) * 600;
            const y = 76 - scoreToWhitePercent(evaluation.whiteCp) * .72;
            return `${x},${y}`;
          }).join(" ")} fill="none" stroke="#667a63" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          {evaluations.map((evaluation, index) => {
            const x = evaluations.length === 1 ? 300 : index / (evaluations.length - 1) * 600;
            const y = 76 - scoreToWhitePercent(evaluation.whiteCp) * .72;
            const isSelected = index === selectedPly;
            return <circle key={index} cx={x} cy={y} r={isSelected ? 5 : 3.5} fill={isSelected ? "#c5a15c" : evaluation.whiteCp >= 0 ? "#718c6f" : "#bd776a"} />;
          })}
        </svg>
      </div> : null}
      {evaluations.length ? <div className="review-transport" role="group" aria-label="Controles para recorrer el análisis">
        <button className="secondary" disabled={selectedPly === 0} onClick={() => selectPly(0)} aria-label="Ir a la posición inicial">|‹</button>
        <button className="secondary" disabled={selectedPly === 0} onClick={() => selectPly(Math.max(0, selectedPly - 1))} aria-label="Ir a la jugada anterior">‹</button>
        <button className="secondary transport-play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pausar recorrido" : "Reproducir recorrido"}>{playing ? "Ⅱ" : "▶"}</button>
        <button className="secondary" disabled={selectedPly >= totalPlies} onClick={() => selectPly(Math.min(totalPlies, selectedPly + 1))} aria-label="Ir a la jugada siguiente">›</button>
        <button className="secondary" disabled={selectedPly >= totalPlies} onClick={() => selectPly(totalPlies)} aria-label="Ir a la posición final">›|</button>
      </div> : null}
      <p className="small analysis-license">Las categorías son estimaciones del motor según la evaluación antes y después de cada jugada; las líneas no sustituyen una explicación reglamentaria. Stockfish.js GPL-3.0 · consulta autores y licencia en el paquete.</p>
    </section>
  );
}

function toWhiteCentipawns(line: AnalysisLine) {
  const sign = line.score.value < 0 ? -1 : 1;
  const value = line.score.kind === "mate"
    ? sign * Math.max(9_000, 10_000 - Math.abs(line.score.value) * 100)
    : line.score.value;
  return line.scorePerspective === "w" ? value : -value;
}

function scoreToWhitePercent(cp: number) {
  const clipped = Math.max(-1_000, Math.min(1_000, cp));
  return 100 / (1 + Math.exp(-0.00368208 * clipped));
}

function terminalWhiteScore(game: Game, ply: number, totalPlies: number) {
  if (ply !== totalPlies || game.result?.reason !== "mate" || !game.result.winner) return 0;
  return game.result.winner === "w" ? 10_000 : -10_000;
}

function reviewMove(move: ReturnType<Game["rules"]["history"]>[number], ply: number, before: PositionEvaluation, after: PositionEvaluation): MoveReview {
  const mover: Color = move.color;
  const lossCp = Math.max(0, Math.round((before.whiteCp - after.whiteCp) * (mover === "w" ? 1 : -1)));
  const played = move.from + move.to + (move.promotion ?? "");
  const second = before.alternatives
    .map((score) => mover === "w" ? score : -score)
    .sort((a, b) => b - a)[1];
  const best = mover === "w" ? before.whiteCp : -before.whiteCp;
  const tactical = !!move.captured || move.san.includes("+") || move.san.includes("#");
  let grade: MoveReview["grade"];
  const preservesMaterialWhileFindingNonObviousMove = !move.captured && move.piece !== "p";
  const alternativeIsClearlyInferior = second !== undefined && best - second >= 250;
  const survivesARealTacticalTest = tactical && (move.san.includes("+") || move.san.includes("#") || !move.captured);
  if (lossCp <= 5 && played === before.bestMove && preservesMaterialWhileFindingNonObviousMove && alternativeIsClearlyInferior && survivesARealTacticalTest) grade = "brilliant";
  else if (lossCp <= 10 && played === before.bestMove) grade = "best";
  else if (lossCp <= 30) grade = "excellent";
  else if (lossCp <= 75) grade = "good";
  else if (lossCp <= 150) grade = "inaccuracy";
  else if (lossCp <= 300) grade = "mistake";
  else grade = "blunder";
  return {
    ply,
    from: move.from,
    to: move.to,
    san: move.san,
    grade,
    symbol: moveSymbols[grade],
    lossCp,
    comment: tutorComment(move, before.bestMove, grade, lossCp),
  };
}

function tutorComment(
  move: ReturnType<Game["rules"]["history"]>[number],
  bestMove: string | null,
  grade: MoveReview["grade"],
  lossCp: number,
) {
  const pieceName = roleNames[move.piece].toLowerCase();
  const bestDestination = bestMove && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove)
    ? bestMove.slice(2, 4)
    : null;
  const alternative = bestDestination && bestDestination !== move.to
    ? ` Yo habría llevado ${pieceArticle(move.piece)} a ${bestDestination}.`
    : "";
  const loss = (lossCp / 100).toFixed(1).replace(".", ",");

  if (grade === "brilliant") return `¡Bro, qué buena! ${move.san} encuentra una idea táctica muy fina. Mira las amenazas que aparecen después: no era una jugada obvia.`;
  if (grade === "best") return `¡Muy bien vista! ${move.san} era justo lo que pedía la posición. Mantienes la ventaja y no le das respiro al rival.`;
  if (grade === "excellent") return move.captured
    ? `Buena esa: ${move.san} gana material y sigues bien. Solo revisa si el rival tiene una recaptura o un jaque molesto.`
    : `Bien jugado. ${move.san} deja tus piezas activas y conserva una buena posición.`;
  if (grade === "good") return move.captured
    ? `Está bien: ${move.san} se lleva una pieza y la posición sigue pareja. Échale un ojo a las amenazas que quedan.`
    : `La jugada es razonable; sigues en la pelea. Para la próxima, busca si puedes mejorar todavía más el ${pieceName}.`;
  if (grade === "inaccuracy") return `Ojo, ${move.san} no pierde la partida, pero había una opción más precisa.${alternative} Se te escapa un poquito de ventaja.`;
  if (grade === "mistake") return `Bro, esta jugada te costó alrededor de ${loss} peones de ventaja.${alternative} Antes de mover, revisa qué te puede capturar o amenazar el rival.`;
  return `Uy, aquí se complicó: ${move.san} deja una amenaza importante sin respuesta y la evaluación cae unos ${loss} peones.${alternative} Respira y revisa jaques, capturas y amenazas antes de mover.`;
}

function pieceArticle(piece: PieceSymbol) {
  return piece === "n" ? "el caballo" : `el ${roleNames[piece].toLowerCase()}`;
}
