import { useId, useRef, useState, type KeyboardEvent } from "react";
import { type RulesEngine } from "../domain/rules";
import {
  colorName,
  roleNames,
  type Square,
  type TeamAssignment,
} from "../domain/types";
import { teams } from "../data/catalog";
import { type Preferences, themes } from "../preferences";
import { Piece } from "../ui/Piece";
import {
  displayToSquare,
  isDarkSquare,
  squares,
  squareToDisplay,
} from "./geometry";

export function Board({
  rules,
  assignment,
  preferences,
  selected,
  disabled,
  onSquare,
  onCancel,
  onImageError,
}: {
  rules: RulesEngine;
  assignment: TeamAssignment;
  preferences: Preferences;
  selected: Square | null;
  disabled: boolean;
  onSquare: (s: Square) => void;
  onCancel: () => void;
  onImageError: () => void;
}) {
  const [focus, setFocus] = useState<Square>("e2");
  const ref = useRef<SVGSVGElement>(null),
    id = useId().replace(/:/g, "");
  const moves = selected ? rules.legalMoves(selected) : [];
  const last = rules.history().at(-1),
    view = preferences.orientation;
  const theme = themes.find((t) => t.id === preferences.themeId)!;
  function keyboard(e: KeyboardEvent<SVGGElement>, square: Square) {
    const directions: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (e.key in directions) {
      e.preventDefault();
      const { row, col } = squareToDisplay(square, view);
      const [dy, dx] = directions[e.key];
      const next = displayToSquare(
        Math.max(0, Math.min(7, row + dy)),
        Math.max(0, Math.min(7, col + dx)),
        view,
      );
      setFocus(next);
      ref.current
        ?.querySelector<SVGElement>(`[data-square="${next}"]`)
        ?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) onSquare(square);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }
  return (
    <div
      className={`board-frame ${preferences.coordinates ? "has-coordinates" : ""}`}
      style={{ background: theme.frame }}
    >
      {preferences.coordinates && (
        <>
          <div className="ranks" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i}>{view === "w" ? 8 - i : i + 1}</span>
            ))}
          </div>
          <div className="files" aria-hidden="true">
            {(view === "w" ? "abcdefgh" : "hgfedcba").split("").map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </>
      )}
      <svg
        ref={ref}
        className="board-core"
        viewBox="0 0 800 800"
        role="group"
        aria-label={`Tablero de ajedrez, vista desde ${colorName(view)}`}
      >
        {squares.map((square) => {
          const { row, col } = squareToDisplay(square, view),
            x = col * 100,
            y = row * 100;
          const piece = rules.get(square),
            legal = moves.find((m) => m.to === square),
            capture = legal?.isCapture() || legal?.isEnPassant();
          const card = piece
            ? teams[assignment[piece.color]].pieces[piece.type]
            : null;
          const check =
            piece?.type === "k" &&
            piece.color === rules.turn() &&
            rules.check();
          const label = `${square}, ${piece ? `${roleNames[piece.type]}, ${card!.name}, ${colorName(piece.color)}, ${teams[assignment[piece.color]].name}` : "vacía"}${legal ? (capture ? ", captura legal" : ", destino legal") : ""}${check ? ", rey en jaque" : ""}`;
          const clip = `${id}-${square}`,
            inset = (100 - preferences.scale * 100) / 2;
          return (
            <g
              key={square}
              data-square={square}
              data-piece={piece ? piece.color + piece.type : ""}
              role="button"
              aria-label={label}
              aria-pressed={selected === square}
              aria-disabled={disabled}
              tabIndex={focus === square ? 0 : -1}
              onFocus={() => setFocus(square)}
              onKeyDown={(e) => keyboard(e, square)}
              onClick={() => {
                setFocus(square);
                if (!disabled) onSquare(square);
              }}
              className="square"
            >
              <defs>
                <clipPath id={clip}>
                  <rect x={x} y={y} width="100" height="100" />
                </clipPath>
              </defs>
              <rect
                x={x}
                y={y}
                width="100"
                height="100"
                fill={
                  isDarkSquare(square) ? preferences.dark : preferences.light
                }
              />
              <g clipPath={`url(#${clip})`} pointerEvents="none">
                {(last?.from === square || last?.to === square) && (
                  <path
                    d={`M${x + 3},${y + 24} V${y + 3} H${x + 24} M${x + 76},${y + 97} H${x + 97} V${y + 76}`}
                    fill="none"
                    stroke="#5d490f"
                    strokeWidth="5"
                  />
                )}
                {check && (
                  <rect
                    x={x + 4}
                    y={y + 4}
                    width="92"
                    height="92"
                    rx="12"
                    fill="#be363a55"
                    stroke="#912829"
                    strokeWidth="4"
                    strokeDasharray="8 5"
                  />
                )}
                {piece && (
                  <Piece
                    sprite={card!.assets[piece.color]}
                    x={x + inset}
                    y={y + inset}
                    size={preferences.scale * 100}
                    onError={onImageError}
                  />
                )}
                {selected === square && (
                  <rect
                    x={x + 4}
                    y={y + 4}
                    width="92"
                    height="92"
                    rx="3"
                    fill="none"
                    stroke="#174d75"
                    strokeWidth="6"
                  />
                )}
                {legal &&
                  (capture ? (
                    <circle
                      cx={x + 50}
                      cy={y + 50}
                      r="44"
                      fill="none"
                      stroke="#174d75"
                      strokeWidth="6"
                      strokeDasharray="12 6"
                    />
                  ) : (
                    <>
                      <circle
                        cx={x + 50}
                        cy={y + 50}
                        r="13"
                        fill="#174d75"
                        stroke="#fff5df"
                        strokeWidth="3"
                      />
                      <circle cx={x + 50} cy={y + 50} r="3" fill="#fff5df" />
                    </>
                  ))}
                <rect
                  className="focus-ring"
                  x={x + 3}
                  y={y + 3}
                  width="94"
                  height="94"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="5"
                />
                <rect
                  className="focus-ring"
                  x={x + 8}
                  y={y + 8}
                  width="84"
                  height="84"
                  fill="none"
                  stroke="#17364d"
                  strokeWidth="3"
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
