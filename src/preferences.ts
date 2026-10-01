import type { Color } from "./domain/types";
export type BoardTheme = {
  id: string;
  name: string;
  light: string;
  dark: string;
  frame: string;
  background: string;
  accent: string;
};
export const themes: BoardTheme[] = [
  {
    id: "olivo",
    name: "Marfil y olivo",
    light: "#e7ddc5",
    dark: "#83927c",
    frame: "#493e30",
    background: "#f5f2ea",
    accent: "#284d40",
  },
  {
    id: "nogal",
    name: "Madera de nogal",
    light: "#ebd4b1",
    dark: "#ae7f5b",
    frame: "#493125",
    background: "#f4ede3",
    accent: "#6b462d",
  },
  {
    id: "pizarra",
    name: "Piedra y pizarra",
    light: "#e0e2df",
    dark: "#81929c",
    frame: "#35444b",
    background: "#eef1f2",
    accent: "#345766",
  },
  {
    id: "bronce",
    name: "Bronce antiguo",
    light: "#ece0bd",
    dark: "#a89d70",
    frame: "#534a32",
    background: "#f4f0e3",
    accent: "#65582b",
  },
];
export type Preferences = {
  version: 1;
  themeId: string;
  light: string;
  dark: string;
  scale: number;
  coordinates: boolean;
  orientation: Color;
};
export const defaults: Preferences = {
  version: 1,
  themeId: "olivo",
  light: themes[0].light,
  dark: themes[0].dark,
  scale: 0.88,
  coordinates: true,
  orientation: "w",
};
export function validatePreferences(value: unknown): Preferences {
  const p = value as Preferences;
  if (
    !p ||
    p.version !== 1 ||
    !themes.some((t) => t.id === p.themeId) ||
    !/^#[0-9a-f]{6}$/i.test(p.light) ||
    !/^#[0-9a-f]{6}$/i.test(p.dark) ||
    !Number.isFinite(p.scale) ||
    p.scale < 0.68 ||
    p.scale > 0.94 ||
    typeof p.coordinates !== "boolean" ||
    !["w", "b"].includes(p.orientation)
  )
    throw new Error("Preferencias incompatibles");
  return {
    version: 1,
    themeId: p.themeId,
    light: p.light,
    dark: p.dark,
    scale: p.scale,
    coordinates: p.coordinates,
    orientation: p.orientation,
  };
}
