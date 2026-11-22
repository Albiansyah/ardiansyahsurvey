import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));

const email = env.INITIAL_MASTER_EMAIL;
const password = env.INITIAL_MASTER_PASSWORD;

async function login(page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard master" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
  test(`master mobile ${viewport.width}px tanpa overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await login(page);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Buka navigasi lainnya" }).click();
    await expect(page.getByRole("heading", { name: "Navigasi lainnya" })).toBeVisible();
    await page.getByRole("link", { name: "Unduh Data" }).click();
    await expect(page.getByRole("heading", { name: "Unduh Data" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/master-${viewport.width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Outlet", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Data outlet pelanggan" })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/outlet-${viewport.width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("desktop master dan navigasi keyboard login", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard master" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "Outlet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Data outlet pelanggan" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "test-results/master-desktop.png", fullPage: true });
});
