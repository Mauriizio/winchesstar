import { useCallback, useEffect, useState } from "react";
import { createGame, joinGame, listGames } from "../online/games";
import { clearInvitation, pendingInvitation } from "../online/auth";
import { normalizeRoomCode } from "../online/roomCode";
import { playerColor } from "../online/state";
import { onlineError } from "../online/errors";
import type { OnlineGame, OnlinePlayer } from "../online/types";
import { colorName, resultNames, type TeamAssignment } from "../domain/types";

export function OnlineLobby({ userId, assignment, onAssignment, onOpen }: {
  userId: string; assignment: TeamAssignment; onAssignment: (value: TeamAssignment) => void; onOpen: (id: string) => void;
}) {
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  const [code, setCode] = useState(() => pendingInvitation() ?? "");
  const [games, setGames] = useState<OnlineGame[]>([]);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const result = await listGames(offset);
      setGames((old) => offset ? [...old, ...result.games] : result.games);
      setPlayers((old) => offset ? [...old, ...result.players] : result.players);
      setMore(result.games.length === 20);
    } catch (error) { setError(onlineError(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const invitation = pendingInvitation();
    if (!invitation) return;
    let alive = true;
    setBusy(true);
    // join_game is idempotent for an existing participant, including StrictMode retries.
    void joinGame(invitation).then((id) => {
      if (alive) { clearInvitation(); onOpen(id); }
    }).catch((error) => { if (alive) setError(onlineError(error)); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [userId, onOpen]);
  async function open(operation: () => Promise<string>) {
    setBusy(true); setError("");
    try { const id = await operation(); clearInvitation(); onOpen(id); }
    catch (error) { setError(onlineError(error)); }
    finally { setBusy(false); }
  }
  return <section className="online-lobby">
    <div className="game-heading"><div><div className="eyebrow">WINCHESSTAR</div><h1>Jugar online</h1></div></div>
    <p>Una partida privada para dos personas. Sin reloj, con las reglas y piezas de siempre.</p>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <div className="online-options">
      <section className="online-panel"><h2>Crear partida</h2>
        <div className="online-form"><label>Tu color<select value={color} onChange={(e) => setColor(e.target.value as typeof color)}><option value="random">Aleatorio</option><option value="w">Quiero blancas</option><option value="b">Quiero negras</option></select></label>
          <label>Ejército con blancas<select value={assignment.w} onChange={(e) => onAssignment({ w: e.target.value, b: e.target.value === "libertadores" ? "realistas" : "libertadores" })}><option value="libertadores">Libertadores</option><option value="realistas">Realistas</option></select></label>
          <button className="primary" disabled={busy} onClick={() => void open(() => createGame(color, assignment.w))}>Crear partida privada</button>
        </div>
      </section>
      <section className="online-panel"><h2>Unirse con código</h2>
        <form className="online-form" onSubmit={(e) => { e.preventDefault(); const parsed = normalizeRoomCode(code); if (!parsed) { setError("Escribe un código válido de seis caracteres."); return; } void open(() => joinGame(parsed)); }}>
          <label>Código de sala<input autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={6} minLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          <button className="primary" disabled={busy}>Entrar a la sala</button>
        </form>
      </section>
    </div>
    <section className="my-games" aria-labelledby="my-games-title"><div className="section-title"><h2 id="my-games-title">Mis partidas</h2><button className="secondary" disabled={loading} onClick={() => void reload()}>Actualizar partidas</button></div>
      {loading && <p role="status">Cargando partidas…</p>}
      {!loading && !games.length && <p>Aún no tienes partidas online. Crea una sala o entra con un código.</p>}
      <div className="game-cards">{games.map((game) => {
        const ownColor = playerColor(game, userId);
        const opponentId = ownColor === "w" ? game.black_player_id : game.white_player_id;
        const opponent = players.find((p) => p.id === opponentId)?.username;
        const label = game.status === "waiting" ? "Esperando rival" : game.status === "cancelled" ? "Cancelada" : game.status === "finished" ? "Terminada" : ownColor === game.turn ? "Tu turno" : "Turno rival";
        return <article className="online-panel game-card" key={game.id}>
          <div className="eyebrow">{label}</div><h3>{opponent ? `Contra ${opponent}` : `Sala ${game.room_code}`}</h3>
          <p>{ownColor ? `Juegas con ${colorName(ownColor)}` : "Color por asignar"}</p>
          {game.result && <p>{resultNames[game.result.reason]} · {game.result.winner ? `Ganan las ${colorName(game.result.winner)}` : "Tablas"}</p>}
          <time dateTime={game.created_at}>{new Date(game.created_at).toLocaleString("es")}</time>
          <button className="secondary full" onClick={() => onOpen(game.id)}>Abrir partida</button>
        </article>;
      })}</div>
      {more && <button className="secondary" disabled={loading} onClick={() => void reload(games.length)}>Ver más partidas</button>}
    </section>
  </section>;
}
