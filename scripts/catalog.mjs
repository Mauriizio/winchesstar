import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export async function prepareCatalog(root, generated) {
  const text = await readFile(
    path.join(root, "docs/01_PERSONAJES_Y_COLECCIONES.md"),
    "utf8",
  );
  const references = {};
  for (const line of text.split("\n").filter((l) => /^- \*\*H\d\d/.test(l))) {
    const id = line.match(/H\d\d/)[0];
    references[id] = [...line.matchAll(/\[([^\]]+)\]\((https:[^)]+)\)/g)].map(
      (m) => ({ title: m[1], url: m[2] }),
    );
  }
  const cards = [
    ...text.matchAll(
      /### (?:Rey|Dama|Alfil|Caballo|Torre|Peón): ([^\n]+)\n([\s\S]*?)(?=\n### |\n## |$)/g,
    ),
  ].map((m) => {
    const body = m[2];
    const sourceIds = body.match(/H\d\d/g) ?? [];
    return {
      id: body.match(/- ID: `([^`]+)`/)[1],
      name: m[1],
      role: body.match(/Función del motor: `([^`]+)`/)[1],
      kind: body.includes("Tipo de representación: persona")
        ? "person"
        : body.includes("Tipo de representación: unidad")
          ? "unit"
          : "structure",
      description: body.match(/```text\n([\s\S]*?)\n```/)[1],
      sources: sourceIds.length
        ? sourceIds.flatMap((id) => references[id])
        : [
            {
              title:
                "Concepto original del creador; construcción simbólica, sin edificio histórico identificado.",
            },
          ],
    };
  });
  if (cards.length !== 12)
    throw new Error("El catálogo debe contener doce fichas");
  await writeFile(
    path.join(generated, "characters.json"),
    JSON.stringify(cards, null, 2) + "\n",
  );
}
