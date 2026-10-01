import { Game } from "./domain/game";
import { teams } from "./data/catalog";
import { defaults, validatePreferences, type Preferences } from "./preferences";
import type { Color, MoveInput, Outcome, TeamAssignment } from "./domain/types";
export const SAVE_KEY = "ajedrez-tematico.game.v1",
  PREF_KEY = "ajedrez-tematico.preferences.v1";
export type SavedGame = {
  version: 1;
  initialFen: string;
  moves: MoveInput[];
  teams: TeamAssignment;
  preferences: Preferences;
  result: Outcome | null;
  offer: Color | null;
};
export function serializeGame(game: Game, preferences: Preferences): SavedGame {
  return {
    version: 1,
    initialFen: game.rules.initialFen,
    moves: game.rules.inputs(),
    teams: game.teams,
    preferences,
    result: game.result,
    offer: game.offer,
  };
}
export function restoreGame(raw: string): {
  game: Game;
  preferences: Preferences;
} {
  const save = JSON.parse(raw) as SavedGame;
  if (
    !save ||
    save.version !== 1 ||
    !Array.isArray(save.moves) ||
    save.moves.length > 20000 ||
    typeof save.initialFen !== "string" ||
    !save.teams ||
    !teams[save.teams.w] ||
    !teams[save.teams.b] ||
    save.teams.w === save.teams.b
  )
    throw new Error("Guardado incompatible");
  const preferences = validatePreferences(save.preferences);
  const game = new Game(save.teams, save.initialFen);
  for (const move of save.moves) {
    if (!move || typeof move.from !== "string" || typeof move.to !== "string")
      throw new Error("Historial inválido");
    game.play(move);
  }
  if (
    save.offer !== null &&
    (!["w", "b"].includes(save.offer) || save.moves.length < 2 || save.result)
  )
    throw new Error("Oferta inválida");
  if (game.result) {
    if (JSON.stringify(game.result) !== JSON.stringify(save.result))
      throw new Error("Resultado inconsistente");
  } else if (save.result) {
    const result = save.result;
    if (result.reason === "threefold" || result.reason === "fifty")
      game.claim(result.reason, result.declaredMove);
    else if (result.reason === "resignation") game.resign();
    else if (
      result.reason === "agreement" &&
      save.moves.length >= 2 &&
      result.winner === null
    )
      game.result = { winner: null, reason: "agreement" };
    else throw new Error("Resultado guardado inválido");
    if (JSON.stringify(game.result) !== JSON.stringify(result))
      throw new Error("Resultado inconsistente");
  }
  game.offer = save.offer;
  return { game, preferences };
}
export type InitialState = {
  game: Game | null;
  preferences: Preferences;
  error: string | null;
};
export function readLocal(): InitialState {
  let preferences: Preferences | undefined;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) preferences = validatePreferences(JSON.parse(raw));
  } catch {
    /* Independent appearance preferences can be reset safely. */
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw)
      return { game: null, preferences: preferences ?? defaults, error: null };
    const restored = restoreGame(raw);
    return {
      ...restored,
      preferences: preferences ?? restored.preferences,
      error: null,
    };
  } catch {
    return {
      game: null,
      preferences: preferences ?? defaults,
      error:
        "No se pudo recuperar la partida guardada. El archivo es inválido o pertenece a otra versión. Puedes descargarlo antes de iniciar una partida nueva.",
    };
  }
}
export function persist(game: Game | null, preferences: Preferences) {
  localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
  if (game)
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(serializeGame(game, preferences)),
    );
}
