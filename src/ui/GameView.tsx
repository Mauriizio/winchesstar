import { useState } from "react";
import type { Game } from "../domain/game";
import {
  colorName,
  opposite,
  resultNames,
  roleNames,
  type MoveInput,
  type Promotion,
  type Square,
} from "../domain/types";
import { teams } from "../data/catalog";
import type { Preferences } from "../preferences";
import { Board } from "../board/Board";
import { Dialog } from "./Dialog";
import { Piece } from "./Piece";
import type { GameAction } from "../online/types";

export function GameView({
  game,
  preferences,
  onChange,
  onPreferences,
  onLobby,
  onNew,
  onSettings,
  onImageError,
  online,
}: {
  game: Game;
  preferences: Preferences;
  onChange: (operation: () => void) => void;
  onPreferences: (p: Preferences) => void;
  onLobby: () => void;
  onNew: () => void;
  onSettings: () => void;
  onImageError: () => void;
  online?: {
    color: "w" | "b";
    disabled: boolean;
    names: Record<"w" | "b", string>;
    onAction: (action: GameAction) => void;
  };
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<MoveInput | null>(null);
  const [dialog, setDialog] = useState<"resign" | "claims" | "help" | null>(
    null,
  );
  const rules = game.rules,
    turn = rules.turn(),
    history = rules.history();
  const last = history.at(-1),
    currentTeam = teams[game.teams[turn]];
  const cannotMove = !!online && (online.disabled || online.color !== turn);
  function dispatch(action: GameAction, local: () => void) {
    if (online) online.onAction(action);
    else onChange(local);
  }
  function play(move: MoveInput) {
    dispatch({ type: "move", move }, () => game.play(move));
    setSelected(null);
    setPromotion(null);
  }
  function squareClick(square: Square) {
    if (game.result || cannotMove) return;
    if (square === selected) {
      setSelected(null);
      return;
    }
    if (selected) {
      const options = rules.legalMoves(selected).filter((m) => m.to === square);
      if (options.length) {
        if (options.some((m) => m.promotion))
          setPromotion({ from: selected, to: square });
        else play({ from: selected, to: square });
        return;
      }
    }
    setSelected(rules.get(square)?.color === turn ? square : null);
  }
  const player = (color: "w" | "b") => (
    <div
      className={`player-strip ${turn === color && !game.result ? "is-turn" : ""}`}
    >
      <span className={`player-dot ${color}`} />
      <div>
        <strong>{online ? online.names[color] : teams[game.teams[color]].name}</strong>
        <span>
          {colorName(color)}
          {online ? ` · ${teams[game.teams[color]].name}` : ""}
          {turn === color && !game.result ? (online && color !== online.color ? " · Turno rival" : " · Tu turno") : ""}
        </span>
      </div>
      <div
        className="captured"
        aria-label={`Piezas capturadas por ${colorName(color)}`}
      >
        {history
          .filter((m) => m.color === color && m.captured)
          .map((m, i) => (
            <span key={i} title={roleNames[m.captured!]}>
              {{ p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" }[m.captured!]}
            </span>
          ))}
      </div>
      <span className="no-clock">Sin reloj</span>
    </div>
  );
  const claims = dialog === "claims" ? game.outcomes.claims(rules) : [];
  const prospective =
    dialog === "claims" ? game.outcomes.prospective(rules) : [];
  return (
    <section className="game-page">
      <div className="game-heading">
        <div>
          <div className="eyebrow">LIBERTADORES CONTRA REALISTAS</div>
          <h1>El tablero</h1>
        </div>
        <button className="text-button" onClick={onLobby}>
          ← Volver al lobby
        </button>
      </div>
      <div className="game-layout">
        <div className="board-column">
          {player(opposite(preferences.orientation))}
          <Board
            rules={rules}
            assignment={game.teams}
            preferences={preferences}
            selected={selected}
            disabled={!!game.result || !!promotion || cannotMove}
            onSquare={squareClick}
            onCancel={() => {
              setSelected(null);
              setPromotion(null);
            }}
            onImageError={onImageError}
          />
          {player(preferences.orientation)}
          <div className="board-toolbar">
            <button
              className="secondary"
              onClick={() =>
                onPreferences({
                  ...preferences,
                  orientation: opposite(preferences.orientation),
                })
              }
            >
              ↻ Girar tablero
            </button>
            <button className="secondary" onClick={onSettings}>
              ◈ Personalizar
            </button>
            <button
              className="icon-button"
              aria-label="Ayuda para jugar"
              onClick={() => setDialog("help")}
            >
              ?
            </button>
          </div>
          <p className="board-hint">
            Selecciona una pieza y luego un destino marcado.{" "}
            <span>También puedes usar las flechas y Enter.</span>
          </p>
        </div>
        <aside className="game-sidebar">
          <section
            className={`status-panel ${game.result ? "finished" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="eyebrow">
              {game.result
                ? "PARTIDA FINALIZADA"
                : `JUGADA ${Math.floor(history.length / 2) + 1}`}
            </div>
            <h2>
              {game.result
                ? game.result.winner
                  ? `Ganan las ${colorName(game.result.winner)}`
                  : "Tablas"
                : rules.check()
                  ? "Rey en jaque"
                  : `Juegan las ${colorName(turn)}`}
            </h2>
            <p>
              {game.result
                ? `${resultNames[game.result.reason]}${game.result.winner ? ` · ${teams[game.teams[game.result.winner]].name}` : ""}`
                : `${currentTeam.name}${rules.check() ? " · Protege a tu rey." : " · Piensa tu próxima jugada."}`}
            </p>
            {game.result?.declaredMove && (
              <p className="small">
                Jugada declarada: {game.result.declaredMove.from}–
                {game.result.declaredMove.to}
                {game.result.declaredMove.promotion ?? ""}. No se ejecutó.
              </p>
            )}
            {game.result && !online && (
              <button className="primary full" onClick={onNew}>
                Nueva partida →
              </button>
            )}
            {!game.result && (
              <div className="status-bottom">
                <span className="live-dot" />
                {online ? (turn === online.color ? "Partida online · Tu turno" : "Partida online · Turno rival") : "Partida local · 2 jugadores"}
              </div>
            )}
          </section>
          {game.offer && !game.result && (
            <section className="offer-panel" aria-live="polite">
              <h3>Oferta de tablas</h3>
              <p>
                Las {colorName(game.offer)} proponen tablas. Responden las{" "}
                {colorName(opposite(game.offer))}.
              </p>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!!online && (online.disabled || game.offer === online.color)}
                  onClick={() => dispatch({ type: "accept-draw" }, () => game.acceptDraw())}
                >
                  Aceptar tablas
                </button>
                <button
                  className="secondary"
                  disabled={!!online && (online.disabled || game.offer === online.color)}
                  onClick={() => dispatch({ type: "reject-draw" }, () => game.rejectDraw())}
                >
                  Rechazar
                </button>
              </div>
              <p className="small">
                Una jugada del rival también rechaza la oferta.
              </p>
            </section>
          )}
          <section className="history-panel">
            <div className="panel-heading">
              <h3>Cuaderno de jugadas</h3>
              <span>{history.length} medias jugadas</span>
            </div>
            <div className="history-head">
              <span>N.º</span>
              <span>Blancas</span>
              <span>Negras</span>
            </div>
            <div
              className="history-scroll"
              tabIndex={0}
              role="region"
              aria-label="Historial de jugadas"
            >
              {!history.length ? (
                <div className="empty-history">
                  <span aria-hidden="true">♙</span>
                  <p>
                    Todo comienza con
                    <br />
                    una primera jugada.
                  </p>
                </div>
              ) : (
                <ol className="move-list">
                  {Array.from(
                    { length: Math.ceil(history.length / 2) },
                    (_, i) => (
                      <li key={i}>
                        <span>{i + 1}.</span>
                        <span
                          className={history[i * 2] === last ? "last-move" : ""}
                        >
                          {history[i * 2]?.san}
                        </span>
                        <span
                          className={
                            history[i * 2 + 1] === last ? "last-move" : ""
                          }
                        >
                          {history[i * 2 + 1]?.san ?? "—"}
                        </span>
                      </li>
                    ),
                  )}
                </ol>
              )}
            </div>
            {last && (
              <div className="last-move-caption">
                Última jugada:{" "}
                <strong>
                  {last.from} → {last.to} · {last.san}
                </strong>
              </div>
            )}
          </section>
          {!game.result && (
            <section className="game-actions">
              <button
                className="secondary"
                disabled={history.length < 2 || !!game.offer || cannotMove}
                onClick={() => dispatch({ type: "offer-draw" }, () => game.offerDraw())}
              >
                Ofrecer tablas
              </button>
              <button className="secondary" disabled={cannotMove} onClick={() => setDialog("claims")}>
                Consultar reclamación
              </button>
              <button
                className="text-button danger"
                disabled={online?.disabled}
                onClick={() => setDialog("resign")}
              >
                Rendirse
              </button>
            </section>
          )}
          <p className="save-note">
            {online ? "◉ Partida e historial guardados en tu cuenta." : "◉ Guardado en este dispositivo después de cada jugada."}
          </p>
        </aside>
      </div>
      {promotion && (
        <Dialog
          title="Elige tu promoción"
          onClose={() => {
            setPromotion(null);
            setSelected(null);
          }}
        >
          <p>
            Tu peón llega a {promotion.to}. Elige una pieza de tu mismo ejército
            y color para completar la jugada.
          </p>
          <div className="promotion-options">
            {(["q", "r", "b", "n"] as Promotion[]).map((role) => (
              <button
                className="promotion-choice"
                key={role}
                disabled={cannotMove}
                onClick={() => play({ ...promotion, promotion: role })}
              >
                <Piece
                  sprite={teams[game.teams[turn]].pieces[role].assets[turn]}
                />
                <strong>{roleNames[role]}</strong>
              </button>
            ))}
          </div>
          <button
            className="secondary full"
            onClick={() => {
              setPromotion(null);
              setSelected(null);
            }}
          >
            Cancelar promoción
          </button>
        </Dialog>
      )}
      {dialog === "resign" && (
        <Dialog
          title="¿Confirmas tu rendición?"
          onClose={() => setDialog(null)}
        >
          <p>
            Se rendirán las {colorName(online?.color ?? turn)} ({teams[game.teams[online?.color ?? turn]].name}). La partida
            finalizará.
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setDialog(null)}>
              Seguir jugando
            </button>
            <button
              className="danger-button"
              disabled={online?.disabled}
              onClick={() => {
                dispatch({ type: "resign" }, () => game.resign());
                setDialog(null);
                setSelected(null);
              }}
            >
              Confirmar rendición
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "claims" && (
        <Dialog title="Reclamar tablas" onClose={() => setDialog(null)}>
          <p>
            Solo se muestran reclamaciones verificadas para las{" "}
            {colorName(turn)}.
          </p>
          {claims.map((reason) => (
            <button
              key={reason}
              className="primary full claim-button"
              disabled={cannotMove}
              onClick={() => {
                dispatch({ type: "claim", reason }, () => game.claim(reason));
                setDialog(null);
              }}
            >
              {resultNames[reason]} · posición actual
            </button>
          ))}
          {prospective.length > 0 && (
            <>
              <h3>Antes de una jugada prevista</h3>
              <p className="small">
                La jugada declarada no se ejecuta. La partida termina al
                reclamar.
              </p>
              <div className="claim-list">
                {prospective.map(({ move, san, reasons }) =>
                  reasons.map((reason) => (
                    <button
                      className="secondary"
                      key={san + reason}
                      disabled={cannotMove}
                      onClick={() => {
                        dispatch({ type: "claim", reason, move }, () => game.claim(reason, move));
                        setDialog(null);
                      }}
                    >
                      <strong>{san}</strong> · {move.from}–{move.to} ·{" "}
                      {resultNames[reason]}
                    </button>
                  )),
                )}
              </div>
            </>
          )}
          {!claims.length && !prospective.length && (
            <div className="empty-state">
              Aún no existe una reclamación válida por triple repetición o por
              50 jugadas.
            </div>
          )}
          <p className="small">
            Cinco repeticiones y 75 jugadas terminan automáticamente la partida.
            El mate tiene prioridad.
          </p>
        </Dialog>
      )}
      {dialog === "help" && (
        <Dialog title="Cómo jugar" onClose={() => setDialog(null)}>
          <div className="help-content">
            <p>
              {online ? "Dos personas juegan desde sus cuentas. La conexión no decide el resultado." : "Dos personas comparten este dispositivo."} Las blancas empiezan; no
              hay reloj ni obligación de mover la primera pieza seleccionada.
            </p>
            <p>
              <strong>Seleccionar:</strong> toca o haz clic en tu pieza. El
              marco azul indica la selección; los puntos son destinos legales y
              los anillos discontinuos son capturas.
            </p>
            <p>
              <strong>Teclado:</strong> Tab entra al tablero; las flechas siguen
              la vista. Enter o espacio seleccionan y mueven. Escape cancela la
              selección o promoción.
            </p>
            <p>
              <strong>Movimientos especiales:</strong> selecciona el rey y su
              destino para enrocar. La captura al paso aparece como captura
              legal solo cuando corresponde. Al promover eliges entre cuatro
              piezas.
            </p>
            <p>
              <strong>Tablas:</strong> se puede ofrecer después de que ambos
              hayan movido. Consulta reclamaciones para posiciones repetidas o
              50 jugadas sin captura ni movimiento de peón.
            </p>
            <p>
              <strong>Guardado:</strong> volver al lobby conserva tu partida.
              {online ? "Puedes recuperarla desde Mis partidas en cualquier dispositivo." : "Una nueva partida pide confirmación antes de reemplazarla."}
            </p>
            <details>
              <summary>Cobertura de posiciones muertas</summary>
              <p>
                Se reconocen los casos de material insuficiente verificados y
                los bloqueos de peones que el servicio puede demostrar cerrados.
                La detección de todas las posiciones muertas excepcionales y de
                toda incapacidad unilateral de mate sigue siendo una limitación;
                no se usa una evaluación de análisis como prueba.
              </p>
            </details>
          </div>
        </Dialog>
      )}
    </section>
  );
}
