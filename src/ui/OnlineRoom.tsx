import { useEffect, useRef, useState } from "react";
import { useOnlineGame } from "../online/hooks/useOnlineGame";
import { cancelGame, rematch } from "../online/games";
import { invitationUrl } from "../online/roomCode";
import { playerColor } from "../online/state";
import { onlineError } from "../online/errors";
import { preloadPieces } from "../data/catalog";
import { colorName } from "../domain/types";
import type { Preferences } from "../preferences";
import { GameView } from "./GameView";

export function OnlineRoom({ id, userId, preferences, onPreferences, onLobby, onOpen, onSettings }: {
  id: string; userId: string; preferences: Preferences; onPreferences: (p: Preferences) => void;
  onLobby: () => void; onOpen: (id: string) => void; onSettings: () => void;
}) {
  const state = useOnlineGame(id, userId);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [orientation, setOrientation] = useState<"w" | "b" | null>(null);
  const row = state.snapshot?.game;
  const color = row ? playerColor(row, userId) : null;
  const whiteTeam = row?.teams.w;
  const blackTeam = row?.teams.b;
  const previousRematch = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setReady(false);
    if (whiteTeam && blackTeam) void preloadPieces({ w: whiteTeam, b: blackTeam })
      .then(() => { if (alive) { setReady(true); setError(""); } })
      .catch(() => { if (alive) setError("No se pudieron cargar las piezas. Reintenta antes de jugar."); });
    return () => { alive = false; };
  }, [whiteTeam, blackTeam, imageAttempt]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);
  // Both clients follow the same child only after the opponent accepts.
  useEffect(() => {
    if (!row) return;
    if (previousRematch.current === null && row.rematch_game_id) onOpen(row.rematch_game_id);
    previousRematch.current = row.rematch_game_id;
  }, [row, onOpen]);
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`${label} copiado`); }
    catch { setError(`No se pudo copiar ${label.toLowerCase()}. Puedes seleccionarlo y copiarlo manualmente.`); }
  }
  async function operate(operation: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await operation(); await state.sync(); }
    catch (error) { setError(onlineError(error)); }
    finally { setBusy(false); }
  }
  const blocked = state.pending || state.syncing || state.connection !== "online";
  return <div className="online-room">
    <section className="online-status" aria-live="polite" aria-atomic="true">
      <strong>{state.connection === "online" ? "● Online" : state.connection === "connecting" ? "Conectando…" : state.connection === "offline" ? "Se perdió la conexión. Intentando reconectar…" : "Reconectando…"}</strong>
      {color && <span>Tú juegas con {colorName(color)}.</span>}
      {row?.status === "active" && <span>{state.opponentOnline ? "Rival conectado" : "Rival desconectado · No hay derrota por desconexión"}</span>}
      <button className="text-button" disabled={state.syncing} onClick={() => void state.sync()}>Sincronizar</button>
    </section>
    {(error || state.error) && <p className="error-banner" role="alert">{error || state.error}</p>}
    {feedback && <p role="status">{feedback}</p>}
    {!row && <button className="secondary" onClick={onLobby}>Volver a Mis partidas</button>}
    {row?.status === "waiting" && <section className="online-panel waiting-room">
      <div className="eyebrow">PARTIDA CREADA</div><h1>Esperando rival…</h1>
      <p>Comparte este código o enlace con la persona que quieras invitar.</p>
      <p>Código de partida: <strong className="room-code">{row.room_code}</strong></p>
      <label className="invite-link">Enlace de invitación<input readOnly value={invitationUrl(window.location.origin, row.room_code)} onFocus={(e) => e.target.select()} /></label>
      <div className="button-row">
        <button className="secondary" onClick={() => void copy(row.room_code, "Código")}>Copiar código</button>
        <button className="primary" onClick={() => void copy(invitationUrl(window.location.origin, row.room_code), "Enlace")}>Copiar enlace</button>
      </div>
      <p className="small">Los colores se asignan al entrar el rival. Puedes cerrar esta página y volver desde Mis partidas.</p>
      <div className="button-row"><button className="text-button" onClick={onLobby}>Mis partidas</button>
        {row.created_by === userId && <button className="text-button danger" disabled={busy || blocked} onClick={() => void operate(() => cancelGame(id))}>Cancelar sala</button>}
      </div>
    </section>}
    {row?.status === "cancelled" && <section className="online-panel"><h1>Sala cancelada</h1><button className="primary" onClick={onLobby}>Mis partidas</button></section>}
    {row && color && state.game && (row.status === "active" || row.status === "finished") && <>
      {!ready && <section className="online-panel"><p>Cargando las piezas…</p><button className="secondary" onClick={() => setImageAttempt((n) => n + 1)}>Reintentar carga de piezas</button></section>}
      {ready && <GameView game={state.game} preferences={{ ...preferences, orientation: orientation ?? color }}
        onChange={() => { throw new Error("Online actions must use the controller"); }}
        onPreferences={(p) => { setOrientation(p.orientation); onPreferences(p); }} onLobby={onLobby} onNew={onLobby}
        onSettings={onSettings} onImageError={() => { setReady(false); setError("Una pieza no pudo cargarse. Reintenta la carga."); }}
        online={{ color, disabled: blocked, names: {
          w: state.snapshot!.players.find((p) => p.id === row.white_player_id)?.username ?? "Blancas",
          b: state.snapshot!.players.find((p) => p.id === row.black_player_id)?.username ?? "Negras",
        }, onAction: (action) => void state.act(action) }} />}
      {row.status === "finished" && <section className="online-panel rematch-panel" aria-live="polite">
        <h2>Otra partida, la misma historia</h2>
        <p>{row.rematch_requested_by === userId ? "Esperando que tu rival acepte la revancha…" : row.rematch_requested_by ? "Tu rival propone una revancha con colores invertidos." : "La revancha crea una partida nueva y conserva este historial."}</p>
        {row.rematch_game_id ? <button className="primary" onClick={() => onOpen(row.rematch_game_id!)}>Abrir revancha</button> : <button className="primary" disabled={busy || blocked || row.rematch_requested_by === userId} onClick={() => void operate(async () => { const next = await rematch(id); if (next) onOpen(next); })}>
          {row.rematch_requested_by && row.rematch_requested_by !== userId ? "Aceptar revancha" : "Jugar revancha"}
        </button>}
      </section>}
    </>}
  </div>;
}
