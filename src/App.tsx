import { useState, type CSSProperties } from "react";
import { Game } from "./domain/game";
import type { TeamAssignment } from "./domain/types";
import { preloadPieces } from "./data/catalog";
import { readLocal, persist, SAVE_KEY } from "./persistence";
import { themes, type Preferences } from "./preferences";
import { Lobby } from "./ui/Lobby";
import { GameView } from "./ui/GameView";
import { Dialog } from "./ui/Dialog";
import { Settings } from "./ui/Settings";

export default function App() {
  const [initial] = useState(readLocal);
  const [game, setGame] = useState<Game | null>(initial.game);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [page, setPage] = useState<"lobby" | "game">("lobby");
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
      className={`app ${page === "game" ? "game-mode" : ""}`}
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
          />
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
