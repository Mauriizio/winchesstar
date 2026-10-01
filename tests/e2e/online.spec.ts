import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Runs only against a real configured Supabase (CI starts the complete local stack).
// No mocked Auth, HTTP, database or Realtime responses.
test.describe("online · Supabase real", () => {
  test.skip(process.env.E2E_ONLINE !== "1", "Requires Supabase Auth, migrations and the deployed game-action function; see docs/ONLINE.md.");
  test.setTimeout(120000);
  const suffix = randomUUID().replaceAll("-", "").slice(0,10);
  const password = `Ws_${randomUUID()}!`;
  const emailA = `a-${suffix}@example.test`;
  const emailB = `b-${suffix}@example.test`;
  async function signup(page: Page, email: string, name: string) {
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByLabel("Nickname", { exact: false }).fill(name);
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  }
  async function move(page: Page, from: string, to: string) {
    await expect(page.locator(`[data-square="${from}"]`)).toHaveAttribute("aria-disabled", "false");
    await page.locator(`[data-square="${from}"]`).click();
    await page.locator(`[data-square="${to}"]`).click();
  }
  test("dos cuentas: invitación antes del registro, realtime, recarga, offline, otro dispositivo, tablas y revancha", async ({ browser }) => {
    const a = await browser.newContext({ viewport: { width:390,height:844 } });
    const b = await browser.newContext({ viewport: { width:320,height:568 } });
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    try {
      await pageA.goto("/?online=1");
      await signup(pageA,emailA,`Patriota_${suffix}`);
      await expect(pageA.getByRole("heading",{name:"Jugar online",exact:true})).toBeVisible();
      await pageA.getByLabel("Tu color").selectOption("w");
      await pageA.getByRole("button",{name:"Crear partida privada"}).click();
      await expect(pageA.getByRole("heading",{name:"Esperando rival…"})).toBeVisible();
      const invitation = await pageA.getByLabel("Enlace de invitación").inputValue();
      const code = new URL(invitation).searchParams.get("room")!;
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      await pageB.goto(invitation);
      await signup(pageB,emailB,`Realista_${suffix}`);
      await expect(pageB.locator(".board-core")).toBeVisible();
      await expect(pageA.locator(".board-core")).toBeVisible();
      await expect(pageB.locator(".online-status")).toContainText("Tú juegas con negras");
      await expect(pageB.locator('[data-square="e7"]')).toHaveAttribute("aria-disabled","true");
      await move(pageA,"e2","e4");
      await expect(pageB.locator('[data-square="e4"]')).toHaveAttribute("data-piece","wp");
      await move(pageB,"e7","e5");
      await expect(pageA.locator('[data-square="e5"]')).toHaveAttribute("data-piece","bp");
      await pageB.reload(); await pageA.reload();
      for (const page of [pageA,pageB]) {
        await expect(page.locator(".move-list")).toContainText("e5");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await b.setOffline(true);
      await expect(pageB.locator(".online-status")).toContainText("Se perdió la conexión");
      await move(pageA,"g1","f3");
      await b.setOffline(false);
      await expect(pageB.locator('[data-square="f3"]')).toHaveAttribute("data-piece","wn");
      await expect(pageB.locator(".online-status")).toContainText("Online");
      await move(pageB,"g8","f6");
      await expect(pageA.locator('[data-square="f6"]')).toHaveAttribute("data-piece","bn");
      const originalUrl = pageA.url();
      const c = await browser.newContext();
      try {
        const otherDevice = await c.newPage();
        await otherDevice.goto("/?online=1");
        await otherDevice.getByLabel("Email",{exact:true}).fill(emailA);
        await otherDevice.getByLabel("Contraseña",{exact:true}).fill(password);
        await otherDevice.getByRole("button",{name:"Iniciar sesión",exact:true}).click();
        await otherDevice.getByRole("button",{name:"Abrir partida",exact:true}).first().click();
        await expect(otherDevice.locator(".move-list")).toContainText("Nf6");
        await otherDevice.getByRole("button",{name:"Cerrar sesión"}).click();
        await expect(otherDevice.getByRole("heading",{name:"Iniciar sesión"})).toBeVisible();
      } finally { await c.close(); }
      // Signing out uses local scope so other signed-in devices continue normally.
      await pageA.getByRole("button",{name:"Ofrecer tablas",exact:true}).click();
      await expect(pageB.locator(".offer-panel")).toBeVisible();
      await pageB.getByRole("button",{name:"Aceptar tablas",exact:true}).click();
      await expect(pageA.locator(".status-panel")).toContainText("Tablas por acuerdo");
      await pageA.getByRole("button",{name:"Jugar revancha"}).click();
      await pageB.getByRole("button",{name:"Aceptar revancha"}).click();
      await expect(pageA).not.toHaveURL(originalUrl);
      await expect(pageA.locator(".online-status")).toContainText("Tú juegas con negras");
      await expect(pageB.locator(".online-status")).toContainText("Tú juegas con blancas");
      await expect(pageA.locator(".move-list li")).toHaveCount(0);
      await pageA.getByRole("button",{name:"Rendirse",exact:true}).click();
      await pageA.getByRole("button",{name:"Confirmar rendición"}).click();
      await expect(pageB.locator(".status-panel")).toContainText("Ganan las blancas");
      await pageA.goto(originalUrl);
      await expect(pageA.locator(".status-panel")).toContainText("Tablas por acuerdo");
      await expect(pageA.locator(".move-list")).toContainText("Nf6");
    } finally { await a.close(); await b.close(); }
  });
  for (const [width,height] of [[320,568],[390,844],[768,1024],[844,390],[1440,900]]) {
    test(`Auth responsive ${width}x${height}`, async ({page}) => {
      await page.setViewportSize({width,height}); await page.goto("/?online=1");
      await expect(page.getByRole("heading",{name:"Iniciar sesión"})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button",{name:"Crear cuenta",exact:true}).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/auth-${width}x${height}.png`,fullPage:true});
    });
  }
});
