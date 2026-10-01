import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  copyFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { manifest } from "./manifest.mjs";
import { prepareCatalog } from "./catalog.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const generated = path.join(root, "src/data/generated");
await mkdir(generated, { recursive: true });
await prepareCatalog(root, generated);
let cached = {};
try {
  cached = JSON.parse(
    await readFile(path.join(generated, "sprites.json"), "utf8"),
  );
} catch {
  /* First import. */
}
const sprites = {};
const inventory = [];
for (const [team, config] of Object.entries(manifest)) {
  const files = await readdir(path.join(root, config.folder));
  const expected = Object.values(config.pieces).flatMap(Object.values);
  const actual = files.filter((f) => /\.png$/i.test(f));
  if (actual.length !== 12 || expected.some((f) => !actual.includes(f)))
    throw new Error(`Inventario inválido: ${config.folder}`);
  const destination = path.join(root, "public/assets/pieces", team);
  const webDestination = path.join(root, "public/assets/pieces/_web", team);
  await mkdir(destination, { recursive: true });
  await mkdir(webDestination, { recursive: true });
  sprites[team] = {};
  for (const [role, colors] of Object.entries(config.pieces)) {
    sprites[team][role] = {};
    for (const [color, filename] of Object.entries(colors)) {
      const source = path.join(root, config.folder, filename);
      const buffer = await readFile(source);
      const hash = createHash("sha256").update(buffer).digest("hex");
      const previous = cached[team]?.[role]?.[color];
      let spec;
      if (previous?.hash === hash) spec = previous;
      else {
        const metadata = await sharp(buffer).metadata();
        if (metadata.format !== "png" || !metadata.hasAlpha)
          throw new Error(`PNG con alfa requerido: ${filename}`);
        const { data, info } = await sharp(buffer)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        let x0 = info.width,
          y0 = info.height,
          x1 = -1,
          y1 = -1;
        // Every nontransparent pixel counts, including antialiasing and thin swords.
        for (let y = 0; y < info.height; y++)
          for (let x = 0; x < info.width; x++) {
            if (
              data[(y * info.width + x) * info.channels + info.channels - 1] > 0
            ) {
              x0 = Math.min(x0, x);
              y0 = Math.min(y0, y);
              x1 = Math.max(x1, x);
              y1 = Math.max(y1, y);
            }
          }
        if (x1 < 0) throw new Error(`Imagen vacía: ${filename}`);
        const pad = Math.ceil(Math.max(x1 - x0, y1 - y0) * 0.012);
        x0 = Math.max(0, x0 - pad);
        y0 = Math.max(0, y0 - pad);
        x1 = Math.min(info.width - 1, x1 + pad);
        y1 = Math.min(info.height - 1, y1 + pad);
        spec = {
          src: `assets/pieces/${team}/${filename}`,
          sourceWidth: info.width,
          sourceHeight: info.height,
          crop: { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 },
          hash,
        };
      }
      await copyFile(source, path.join(destination, filename));
      // Keep exact original copies. Render smaller PNG derivatives in the
      // original SVG coordinate reference to preserve the measured framing.
      const webPath = path.join(webDestination, filename);
      let webBuffer;
      if (previous?.hash === hash && previous?.webVersion === 1) {
        try {
          const candidate = await readFile(webPath);
          if (createHash("sha256").update(candidate).digest("hex") === previous.webHash) webBuffer = candidate;
        } catch { /* Regenerate missing derivatives, including on Vercel. */ }
      }
      if (!webBuffer) {
        webBuffer = await sharp(buffer)
          .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
          .png({ palette: true, colors: 256, quality: 100, effort: 7, dither: 0.6, compressionLevel: 9 })
          .toBuffer();
        await writeFile(webPath, webBuffer);
      }
      spec = { ...spec, originalSrc: `assets/pieces/${team}/${filename}`,
        src: `assets/pieces/_web/${team}/${filename}`, webVersion: 1,
        webHash: createHash("sha256").update(webBuffer).digest("hex"), webBytes: webBuffer.length };
      sprites[team][role][color] = spec;
      inventory.push({
        team,
        role,
        color,
        filename,
        bytes: buffer.length,
        ...spec,
      });
    }
  }
}
await writeFile(
  path.join(generated, "sprites.json"),
  JSON.stringify(sprites, null, 2) + "\n",
);
await mkdir(path.join(root, "docs/validation"), { recursive: true });
await writeFile(
  path.join(root, "docs/validation/assets.json"),
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(
  `24 PNG verificados y copiados; encuadres alfa conservados por SHA-256. ${(inventory.reduce((n, x) => n + x.bytes, 0) / 1048576).toFixed(1)} MiB.`,
);
console.log(`PNG de interfaz: ${(inventory.reduce((n, x) => n + x.webBytes, 0) / 1048576).toFixed(2)} MiB en total; originales intactos.`);
