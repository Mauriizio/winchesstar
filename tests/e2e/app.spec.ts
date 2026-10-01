import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { Game } from "../../src/domain/game";
import { defaults } from "../../src/preferences";
import { serializeGame, SAVE_KEY } from "../../src/persistence";
import sprites from "../../src/data/generated/sprites.json" with { type: "json" };
async function move(page: Page, from: string, to: string) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Comenzar partida" }).click();
  await expect(page.locator(".board-core")).toBeVisible();
}
async function seed(page: Page, game: Game) {
  const raw = JSON.stringify(serializeGame(game, defaults));
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw,
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continuar partida guardada" })
    .click();
  await expect(page.locator(".board-core")).toBeVisible();
}
test("recorrido público: fichas, equipos, captura, apariencia, recarga y resultado", async ({
  page,
}) => {
  const errors: string[] = [],
    failed: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conocer a Simón Bolívar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("24 de julio de 1783");
  await page.getByText("Fuentes consultables", { exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link")).toHaveAttribute(
    "href",
    /memoriachilena/,
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("Ejército con blancas").selectOption("realistas");
  await page.getByRole("button", { name: "Comenzar partida" }).click();
  await expect(page.locator("[data-square]")).toHaveCount(64);
  await expect(page.locator('[data-piece]:not([data-piece=""])')).toHaveCount(
    32,
  );
  await expect(page.locator('[data-square="e1"] image')).toHaveAttribute(
    "href",
    /R-B-R\.png$/,
  );
  await move(page, "e2", "e4");
  await move(page, "d7", "d5");
  await move(page, "e4", "d5");
  await expect(page.locator('[data-piece]:not([data-piece=""])')).toHaveCount(
    31,
  );
  await expect(page.locator(".move-list")).toContainText("exd5");
  const before = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).moves,
    SAVE_KEY,
  );
  await page.getByRole("button", { name: "Girar tablero" }).click();
  await expect(page.locator(".board-core")).toHaveAttribute(
    "aria-label",
    /negras/,
  );
  await page.getByRole("button", { name: "Personalizar" }).click();
  await page.getByRole("button", { name: "Piedra y pizarra" }).click();
  await page.getByLabel("Color de casillas claras").fill("#eacfa4");
  await page.getByLabel("Mostrar coordenadas").uncheck();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).moves,
      SAVE_KEY,
    ),
  ).toEqual(before);
  await page.reload();
  await page
    .getByRole("button", { name: "Continuar partida guardada" })
    .click();
  await expect(page.locator(".move-list")).toContainText("exd5");
  await expect(page.locator(".board-core")).toHaveAttribute(
    "aria-label",
    /negras/,
  );
  await expect(page.locator(".files")).toHaveCount(0);
  await page.getByRole("button", { name: "Rendirse", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar rendición" }).click();
  await expect(
    page.getByRole("heading", { name: "Ganan las blancas" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nueva partida", exact: false })
    .click();
  await page.getByRole("button", { name: "Iniciar nueva partida" }).click();
  await expect(page.locator('[data-piece]:not([data-piece=""])')).toHaveCount(
    32,
  );
  await expect(page.locator(".move-list li")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [768, 1024],
  [844, 390],
  [1440, 900],
]) {
  test(`layout ${width} × ${height}: tablero, diálogo y todos los recursos`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await start(page);
    const box = await page.locator(".board-core").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(1);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Nested SVG geometry must remain 88 × 88 user units, never 100% of the board.
    const piece = await page.locator('[data-square="e1"] .piece').boundingBox();
    expect(piece!.width / box!.width).toBeCloseTo(0.11, 2);
    await page.screenshot({
      path: `docs/validation/board-${width}x${height}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Personalizar" }).click();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(dialog!.width).toBeLessThan(width);
    expect(dialog!.height).toBeLessThan(height);
    await page.getByRole("button", { name: "Cerrar diálogo" }).click();
    await page.getByRole("button", { name: "Volver al lobby" }).click();
    await page.screenshot({
      path: `docs/validation/lobby-${width}x${height}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("teclado sigue orientación; selección y cancelación", async ({ page }) => {
  await start(page);
  const e2 = page.locator('[data-square="e2"]');
  await e2.focus();
  await page.keyboard.press("Enter");
  await expect(e2).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('[data-square="e3"]')).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute(
    "data-piece",
    "wp",
  );
  await page.getByRole("button", { name: "Girar tablero" }).click();
  await page.locator('[data-square="e7"]').focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('[data-square="e6"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
});
test("promoción móvil, Escape no mueve; cuatro opciones y subpromoción", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(
    page,
    new Game(
      { w: "realistas", b: "libertadores" },
      "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
    ),
  );
  await move(page, "a7", "a8");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".promotion-choice")).toHaveCount(4);
  await expect(page.locator('[data-square="a7"]')).toHaveAttribute(
    "data-piece",
    "wp",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-square="a7"]')).toHaveAttribute(
    "data-piece",
    "wp",
  );
  await move(page, "a7", "a8");
  await page.getByRole("button", { name: "Caballo", exact: true }).click();
  await expect(page.locator('[data-square="a8"]')).toHaveAttribute(
    "data-piece",
    "wn",
  );
  await expect(page.locator('[data-square="a8"] image')).toHaveAttribute(
    "href",
    /C-B-R.png$/,
  );
  await expect(
    page.getByRole("heading", { name: "Tablas", exact: true }),
  ).toBeVisible();
});
test("reclamación prevista no ejecuta la jugada", async ({ page }) => {
  await seed(page, new Game(undefined, "7k/8/8/8/8/8/R7/K7 w - - 99 50"));
  await page.getByRole("button", { name: "Consultar reclamación" }).click();
  await page.getByRole("button", { name: /a2–a3.*50 jugadas/ }).click();
  await expect(
    page.getByRole("heading", { name: "Tablas", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-square="a2"]')).toHaveAttribute(
    "data-piece",
    "wr",
  );
  await expect(page.locator(".move-list li")).toHaveCount(0);
});
test("mate real desde inicio y bloqueo de nuevos movimientos", async ({
  page,
}) => {
  await start(page);
  await move(page, "f2", "f3");
  await move(page, "e7", "e5");
  await move(page, "g2", "g4");
  await move(page, "d8", "h4");
  await expect(
    page.getByRole("heading", { name: "Ganan las negras" }),
  ).toBeVisible();
  await expect(page.locator(".status-panel")).toContainText("Jaque mate");
  await expect(page.locator('[data-square="a2"]')).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
test("guardado corrupto ofrece recuperación sin borrado silencioso", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    SAVE_KEY,
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("No se pudo recuperar");
  await expect(
    page.getByRole("button", { name: "Descargar guardado original" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("{broken");
  await page.getByRole("button", { name: "Comenzar partida" }).click();
  await page.getByRole("button", { name: "Iniciar nueva partida" }).click();
  await expect(page.locator(".board-core")).toBeVisible();
});
test("los 24 PNG publicados responden con imágenes válidas", async ({
  request,
}) => {
  for (const pieces of Object.values(sprites))
    for (const colors of Object.values(pieces))
      for (const sprite of Object.values(colors)) {
        const response = await request.get(`/${sprite.src}`);
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("image/png");
        expect((await response.body()).subarray(1, 4).toString()).toBe("PNG");
        expect(
          createHash("sha256")
            .update(await response.body())
            .digest("hex"),
        ).toBe(sprite.webHash);
        const original = await request.get(`/${sprite.originalSrc}`);
        expect(original.status()).toBe(200);
        expect(createHash("sha256").update(await original.body()).digest("hex")).toBe(sprite.hash);
      }
});

test("un fallo de imagen impide iniciar una partida invisible", async ({
  page,
}) => {
  await page.route("**/assets/pieces/_web/realistas/R-N-R.png", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Comenzar partida" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo cargar");
  await expect(page.locator(".board-core")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Comenzar partida" }),
  ).toBeEnabled();
  await page.unroute("**/assets/pieces/_web/realistas/R-N-R.png");
  await page.getByRole("button", { name: "Comenzar partida" }).click();
  await expect(page.locator(".board-core")).toBeVisible();
});

test.describe("interacción táctil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("permite seleccionar, mover y girar mediante toque", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Comenzar partida" }).tap();
    await page.locator('[data-square="e2"]').tap();
    await page.locator('[data-square="e4"]').tap();
    await expect(page.locator('[data-square="e4"]')).toHaveAttribute(
      "data-piece",
      "wp",
    );
    await page.getByRole("button", { name: "Girar tablero" }).tap();
    await expect(page.locator(".board-core")).toHaveAttribute(
      "aria-label",
      /negras/,
    );
  });
});
