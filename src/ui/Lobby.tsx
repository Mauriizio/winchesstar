import { useState } from "react";
import {
  teams,
  roles,
  kindNames,
  type CharacterDefinition,
} from "../data/catalog";
import { roleNames, type Color, type TeamAssignment } from "../domain/types";
import { Piece } from "./Piece";
import { Dialog } from "./Dialog";
export function Lobby({
  assignment,
  onAssignment,
  onStart,
  onContinue,
  saved,
  busy,
  onOnline,
}: {
  assignment: TeamAssignment;
  onAssignment: (a: TeamAssignment) => void;
  onStart: () => void;
  onContinue: () => void;
  saved: boolean;
  busy: boolean;
  onOnline: () => void;
}) {
  const [card, setCard] = useState<{
    character: CharacterDefinition;
    color: Color;
    role: string;
  } | null>(null);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-diamond" />
            WINCHESSTAR · AJEDREZ HISTÓRICO
          </div>
          <h1>
            Juega la historia.<br /><em>Elige tu bando.</em>
          </h1>
          <p>
            Libertadores contra realistas. Partidas, estrategia y personajes históricos en un mismo tablero.
          </p>
          <div className="hero-actions">
            <a className="primary" href="#preparar">
              Jugar ahora <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#coleccion">
              Conocer los bandos ↓
            </a>
          </div>
          <div className="game-facts">
            <span>Juega local u online</span>
            <span>Sin reloj</span>
            <span>Reglas clásicas · piezas históricas</span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Piezas históricas de ambos ejércitos"
          role="img"
        >
          <div className="hero-orbit" />
          <div className="hero-checker" />
          <Piece
            className="hero-piece hero-knight"
            sprite={teams.libertadores.pieces.n.assets.w}
          />
          <Piece
            className="hero-piece hero-king"
            sprite={teams.realistas.pieces.k.assets.b}
          />
          <Piece
            className="hero-piece hero-queen"
            sprite={teams.libertadores.pieces.q.assets.w}
          />
          <span className="art-caption">
            LIBERTADORES <i>contra</i> REALISTAS
          </span>
        </div>
      </section>
      <section className="play-hub" aria-label="Modos de juego">
        <button className="hub-card hub-card-featured" onClick={onOnline}>
          <span className="hub-icon" aria-hidden="true">♟</span>
          <span><strong>Jugar online</strong><small>Desafía a otra persona</small></span>
          <span className="hub-arrow" aria-hidden="true">→</span>
        </button>
        <a className="hub-card" href="#preparar">
          <span className="hub-icon" aria-hidden="true">♜</span>
          <span><strong>Partida local</strong><small>Comparte el tablero</small></span>
          <span className="hub-arrow" aria-hidden="true">→</span>
        </a>
        <a className="hub-card" href="#coleccion">
          <span className="hub-icon" aria-hidden="true">✦</span>
          <span><strong>Explorar los bandos</strong><small>Personajes y sus historias</small></span>
          <span className="hub-arrow" aria-hidden="true">→</span>
        </a>
      </section>
      <section id="preparar" className="setup-panel">
        <div>
          <div className="eyebrow">ESCOGE TU PARTIDA</div>
          <h2>Libertadores vs. Realistas</h2>
          <p className="muted">
            Las blancas comienzan. Ambos ejércitos juegan con las mismas reglas.
          </p>
        </div>
        <div className="setup-controls">
          <label htmlFor="white-team">Ejército con blancas</label>
          <select
            id="white-team"
            value={assignment.w}
            onChange={(e) =>
              onAssignment({
                w: e.target.value,
                b:
                  e.target.value === "libertadores"
                    ? "realistas"
                    : "libertadores",
              })
            }
          >
            <option value="libertadores">Libertadores · blancas</option>
            <option value="realistas">Realistas · blancas</option>
          </select>
          <div className="opponent-label">
            ● {teams[assignment.b].name} con negras
          </div>
          <button className="primary full" aria-label="Comenzar partida · Jugar en este dispositivo" onClick={onStart} disabled={busy}>
            {busy ? "Preparando piezas…" : "Jugar en este dispositivo"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <button className="secondary full" onClick={onOnline}>Jugar online</button>
          {saved && (
            <button
              className="secondary full"
              onClick={onContinue}
              disabled={busy}
            >
              Continuar partida guardada
            </button>
          )}
        </div>
      </section>
      <section id="coleccion" className="collection">
        <div className="section-title">
          <div>
            <div className="eyebrow">EXPLORA LOS EJÉRCITOS</div>
            <h2>Conoce a quienes mueven la historia.</h2>
          </div>
          <p>
            Explora a tu ritmo.
            <br />
            Durante la partida, el tablero es el protagonista.
          </p>
        </div>
        {Object.values(teams).map((team, index) => {
          const color: Color = assignment.w === team.id ? "w" : "b";
          return (
            <section className="team-section" key={team.id}>
              <div className="team-heading">
                <span className="team-number">0{index + 1}</span>
                <div>
                  <h3>{team.name}</h3>
                  <p>{team.description}</p>
                </div>
                <span className={`color-badge ${color}`}>
                  {color === "w" ? "○ Blancas" : "● Negras"}
                </span>
              </div>
              <div className="character-grid">
                {roles.map((role) => {
                  const character = team.pieces[role];
                  return (
                    <article className="character-card" key={character.id}>
                      <button
                        className="card-button"
                        onClick={() =>
                          setCard({ character, color, role: roleNames[role] })
                        }
                        aria-label={`Conocer a ${character.name}`}
                      >
                        <div className="card-image">
                          <span className="role-tag">{roleNames[role]}</span>
                          <Piece sprite={character.assets[color]} />
                        </div>
                        <div className="card-copy">
                          <span className="kind">
                            {kindNames[character.kind]}
                          </span>
                          <h4>{character.name}</h4>
                          <p>{character.description.split("\n")[0]}</p>
                          <span className="card-link">
                            Conocer su historia{" "}
                            <span aria-hidden="true">↗</span>
                          </span>
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        <aside className="next-faction">
          <span className="next-faction-mark" aria-hidden="true">✦</span>
          <div><span className="eyebrow">EL UNIVERSO SIGUE CRECIENDO</span><h3>La resistencia indígena</h3>
            <p>Un nuevo bando se prepara para el tablero, con Guaicaipuro como rey.</p></div>
          <span className="coming-soon">PRÓXIMAMENTE</span>
        </aside>
        <p className="editorial-note">
          Las funciones del ajedrez son representaciones artísticas: Bolívar no
          fue rey ni Manuela Sáenz reina consorte. La colección reúne figuras de
          una época; no representa una única batalla.
        </p>
      </section>
      {card && (
        <Dialog title={card.character.name} onClose={() => setCard(null)}>
          <div className="biography">
            <div className="biography-image">
              <Piece sprite={card.character.assets[card.color]} />
            </div>
            <span className="eyebrow">
              {card.role} · {kindNames[card.character.kind]}
            </span>
            <div className="biography-text">
              {card.character.description.split("\n").map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <details>
              <summary>Fuentes consultables</summary>
              <ul>
                {card.character.sources.map((s) => (
                  <li key={s.title}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.title} ↗
                      </a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </Dialog>
      )}
    </>
  );
}
