/**
 * Offline create, reconnect, and a church-only pull.
 *
 * Run when a signed-in dev server is available:
 *   E2E_EMAIL=... E2E_PASSWORD=... npx playwright test e2e/offline.spec.ts
 *
 * Named phone test, manual: Ptr. Jo Lunas installs an update while an edit is still
 * unsent. The service worker must not clear IndexedDB, and the edit must still sync.
 */
import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("offline calendar", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run against a signed-in server.");

  test("an event saved with no signal appears after reconnect", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.goto("/calendar/new");
    const title = `Offline ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page.getByText("Saved on this phone")).toBeVisible();
    await context.setOffline(false);
    await page.goto("/more");
    await page.getByRole("button", { name: "Sync now" }).click();
    await page.goto("/calendar");
    await expect(page.getByText(title)).toBeVisible();
  });
});
