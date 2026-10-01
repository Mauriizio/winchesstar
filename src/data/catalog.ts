import spriteData from "./generated/sprites.json" with { type: "json" };
import characters from "./generated/characters.json" with { type: "json" };
import type { Color, PieceSymbol } from "../domain/types";
export type SpriteSpec = {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  crop: { x: number; y: number; width: number; height: number };
};
export type CharacterDefinition = {
  id: string;
  name: string;
  kind: "person" | "unit" | "structure" | "symbol";
  description: string;
  sources: { title: string; url?: string }[];
  assets: Record<Color, SpriteSpec>;
};
export type TeamDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  pieces: Record<PieceSymbol, CharacterDefinition>;
};
export const roles: PieceSymbol[] = ["k", "q", "b", "n", "r", "p"];
const definitions = [
  {
    id: "libertadores",
    prefix: "lib-",
    name: "Libertadores",
    category: "historia",
    description:
      "Liderazgo, campañas y vida cotidiana de la independencia sudamericana.",
  },
  {
    id: "realistas",
    prefix: "rea-",
    name: "Realistas",
    category: "historia",
    description:
      "La monarquía española, sus comandantes y las fuerzas que defendían su autoridad.",
  },
] as const;
export const teams: Record<string, TeamDefinition> = Object.fromEntries(
  definitions.map((team) => [
    team.id,
    {
      ...team,
      pieces: Object.fromEntries(
        roles.map((role) => {
          const card = characters.find(
            (c) => c.id.startsWith(team.prefix) && c.role === role,
          )!;
          if (!["person", "unit", "structure", "symbol"].includes(card.kind))
            throw new Error("Tipo de ficha inválido");
          const character: CharacterDefinition = {
            ...card,
            kind: card.kind as CharacterDefinition["kind"],
            assets: spriteData[team.id][role],
          };
          return [role, character];
        }),
      ) as TeamDefinition["pieces"],
    },
  ]),
);
export const kindNames = {
  person: "Personaje histórico",
  unit: "Soldado anónimo",
  structure: "Fortificación",
  symbol: "Representación simbólica",
};
export const assetUrl = (spec: SpriteSpec) =>
  import.meta.env.BASE_URL + spec.src;
export async function preloadPieces(assignment: Record<Color, string>) {
  await Promise.all(
    (["w", "b"] as const).flatMap((color) =>
      roles.map(
        (role) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            const timer = window.setTimeout(() => {
              image.onload = null;
              image.onerror = null;
              reject(new Error("La carga de piezas tardó demasiado. Revisa la conexión y vuelve a intentarlo."));
            }, 45000);
            image.onload = () => { window.clearTimeout(timer); resolve(); };
            image.onerror = () => {
              window.clearTimeout(timer);
              reject(
                new Error(
                  `No se pudo cargar ${teams[assignment[color]].pieces[role].assets[color].src}. Revisa la conexión e inténtalo otra vez.`,
                ),
              );
            };
            image.src = assetUrl(
              teams[assignment[color]].pieces[role].assets[color],
            );
          }),
      ),
    ),
  );
}
