import { test, expect } from "@playwright/test";

test.describe("Auth component · layout without backend", () => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, "The component harness exists only on the local Vite development server.");
  for (const [width,height] of [[320,568],[390,844],[768,1024],[844,390],[1440,900]]) {
    test(`login, registro y recuperación ${width}x${height}`, async ({page}) => {
      await page.setViewportSize({width,height});
      await page.goto("/tests/fixtures/auth.html");
      await expect(page.getByRole("heading",{name:"Iniciar sesión"})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button",{name:"Crear cuenta",exact:true}).click();
      await expect(page.getByLabel("Nickname")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/auth-component-${width}x${height}.png`,fullPage:true});
      await page.getByRole("button",{name:"Olvidé mi contraseña"}).click();
      await expect(page.getByRole("heading",{name:"Recuperar contraseña"})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});
