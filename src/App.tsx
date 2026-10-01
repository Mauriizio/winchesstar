import { useCallback, useState, type CSSProperties } from "react";
import { Game } from "./domain/game";
import type { TeamAssignment } from "./domain/types";
import { preloadPieces } from "./data/catalog";
import { readLocal, persist, SAVE_KEY } from "./persistence";
import { themes, type Preferences } from "./preferences";
import { Lobby } from "./ui/Lobby";
import { GameView } from "./ui/GameView";
import { Dialog } from "./ui/Dialog";
import { Settings } from "./ui/Settings";
import { useAuth } from "./online/hooks/useAuth";
import { onlineConfigured } from "./online/supabase";
import { pendingInvitation } from "./online/auth";
import { AuthPanel } from "./ui/AuthPanel";
import { OnlineLobby } from "./ui/OnlineLobby";
import { OnlineRoom } from "./ui/OnlineRoom";

export default function App() {
  const [initial] = useState(readLocal);
  const [game, setGame] = useState<Game | null>(initial.game);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [page, setPage] = useState<"lobby" | "game" | "online">(() => {
    const params = new URLSearchParams(window.location.search);
    return pendingInvitation() || params.has("online") || params.has("game") || params.has("recovery") || params.has("code") ? "online" : "lobby";
  });
  const auth = useAuth();
  const [onlineId, setOnlineId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get("game");
    return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  });
  const openOnlineGame = useCallback((id: string) => {
    setOnlineId(id); setPage("online");
    const url = new URL("/", window.location.origin); url.searchParams.set("game", id);
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }, []);
  const onlineLobby = useCallback(() => {
    setOnlineId(null); setPage("online");
    window.history.replaceState(null, "", "/?online=1");
  }, []);
  const [assignment, setAssignment] = useState<TeamAssignment>({
    w: "libertadores",
    b: "realistas",
  });
  const [modal, setModal] = useState<"settings" | "new" | null>(null);
  const [error, setError] = useState<string | null>(initial.error);
  const [invalid, setInvalid] = useState(!!initial.error);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState(0);
  const theme = themes.find((t) => t.id === preferences.themeId)!;
  function save(nextGame: Game | null, p: Preferences) {
    try {
      persist(nextGame, p);
    } catch {
      setError(
        "El navegador no permite guardar en este dispositivo. La partida sigue abierta, pero no cierres ni recargues esta pestaña.",
      );
    }
  }
  function updatePreferences(p: Preferences) {
    setPreferences(p);
    save(game, p);
  }
  function change(operation: () => void) {
    try {
      operation();
      setRevision((r) => r + 1);
      save(game, preferences);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function enter(newGame: boolean) {
    setBusy(true);
    setError(null);
    setModal(null);
    const next = newGame ? new Game(assignment) : game;
    if (!next) {
      setBusy(false);
      return;
    }
    try {
      await preloadPieces(next.teams);
      setGame(next);
      setInvalid(false);
      setPage("game");
      setRevision((r) => r + 1);
      setSession((s) => s + 1);
      save(next, preferences);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function start() {
    if (game || invalid) setModal("new");
    else void enter(true);
  }
  function downloadInvalid() {
    const raw = localStorage.getItem(SAVE_KEY) ?? "{}";
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "partida-para-recuperacion.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div
      className={`app ${page === "game" || (page === "online" && onlineId) ? "game-mode" : ""}`}
      style={
        {
          "--page-bg": theme.background,
          "--accent": theme.accent,
        } as CSSProperties
      }
    >
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("lobby");
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            ♜
          </span>
          <span>
            Ajedrez <em>educativo temático</em>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          {auth.session && <div className="user-menu">
            <span className="user-name">{auth.profile?.username ?? "Mi cuenta"}</span>
            <button className="text-button" onClick={onlineLobby}>Mis partidas</button>
            <button className="text-button" onClick={() => void auth.signOut()}>Cerrar sesión</button>
          </div>}
          {page === "lobby" ? (
            <a className="nav-collection" href="#coleccion">
              La colección
            </a>
          ) : (
            <button className="text-button" onClick={() => setPage("lobby")}>
              Lobby
            </button>
          )}
          <button
            className="header-settings"
            onClick={() => setModal("settings")}
          >
            <span aria-hidden="true">◈</span> Apariencia
          </button>
          <span className="edition">EDICIÓN 01</span>
        </nav>
      </header>
      <main id="contenido">
        {auth.error && <p role="alert" className="error-banner">{auth.error}</p>}
        {error && (
          <div role="alert" className="error-banner">
            <div>{error}</div>
            {invalid && (
              <button className="secondary" onClick={downloadInvalid}>
                Descargar guardado original
              </button>
            )}
            <button
              aria-label="Cerrar aviso"
              className="icon-button"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}
        {page === "lobby" ? (
          <Lobby
            assignment={assignment}
            onAssignment={setAssignment}
            onStart={start}
            onContinue={() => void enter(false)}
            saved={!!game}
            busy={busy}
            onOnline={onlineLobby}
          />
        ) : page === "online" ? (
          !onlineConfigured ? <section className="online-panel"><h1>Jugar online</h1><p>El servicio online aún no está configurado. Puedes seguir jugando en este dispositivo.</p><button className="primary" onClick={() => setPage("lobby")}>Jugar en este dispositivo</button></section> :
          auth.loading ? <p role="status">Restaurando sesión…</p> :
          !auth.session || auth.recovery ? <AuthPanel recovery={auth.recovery && !!auth.session} onRecovered={auth.finishRecovery} /> :
          onlineId ? <OnlineRoom key={`${auth.session.user.id}:${onlineId}`} id={onlineId} userId={auth.session.user.id} preferences={preferences} onPreferences={updatePreferences} onLobby={onlineLobby} onOpen={openOnlineGame} onSettings={() => setModal("settings")} /> :
          <OnlineLobby userId={auth.session.user.id} assignment={assignment} onAssignment={setAssignment} onOpen={openOnlineGame} />
        ) : (
          game && (
            <GameView
              key={session}
              game={game}
              preferences={preferences}
              onChange={change}
              onPreferences={updatePreferences}
              onLobby={() => {
                setPage("lobby");
                window.scrollTo(0, 0);
              }}
              onNew={start}
              onSettings={() => setModal("settings")}
              onImageError={() => {
                setPage("lobby");
                setError(
                  "Una pieza no pudo cargarse. Pulsa Continuar para reintentar la carga antes de jugar.",
                );
              }}
            />
          )
        )}
        <span className="sr-only" data-revision={revision} />
      </main>
      <footer className="site-footer">
        <span>Ajedrez educativo temático</span>
        <span>La misma estrategia. Otra forma de descubrir la historia.</span>
        <span>Hecho para compartir el tablero.</span>
      </footer>
      {modal === "settings" && (
        <Dialog title="Tu tablero, a tu manera" onClose={() => setModal(null)}>
          <Settings value={preferences} onChange={updatePreferences} />
        </Dialog>
      )}
      {modal === "new" && (
        <Dialog
          title="¿Preparar una nueva partida?"
          onClose={() => setModal(null)}
        >
          <p>
            {invalid
              ? "Se reemplazará el guardado incompatible. Puedes descargar el original desde el aviso del lobby."
              : "La nueva partida reemplazará la guardada en este dispositivo. La apariencia que elegiste se conserva."}
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button className="primary" onClick={() => void enter(true)}>
              Iniciar nueva partida
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
