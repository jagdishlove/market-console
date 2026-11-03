import { expect, test } from "@playwright/test";

test("drill down, URL state and back/forward", async ({ page }) => {
  await page.goto("/?mode=analyst");
  await page.getByRole("button", { name: "Europe", exact: true }).first().click();
  await expect(page).toHaveURL(/focus=eu/);
  await page.getByRole("button", { name: "Germany" }).first().click();
  await expect(page).toHaveURL(/focus=de/);
  await expect(page.getByRole("navigation", { name: "Drill path" })).toContainText("Germany");

  await page.goBack();
  await expect(page).toHaveURL(/focus=eu/);
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Drill path" })).toContainText("Europe");
});

test("map is keyboard operable and drills in", async ({ page }) => {
  await page.goto("/");
  const brazil = page.getByRole("button", { name: /^Brazil:/ });
  await brazil.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/focus=br/);
});

test("assistant streams an answer with verifiable sources, and abstains honestly", async ({ page }) => {
  await page.goto("/?assistant=open");
  await page.getByRole("button", { name: /Which markets are at risk/ }).click();
  await expect(page.getByText("High confidence")).toBeVisible({ timeout: 15_000 });
  const sources = page.getByRole("region", { name: "Source data" });
  await expect(sources).toContainText("Germany, latest period");
  await sources.getByRole("button", { name: "Show on dashboard" }).first().click();
  await expect(page).toHaveURL(/focus=de/);

  await page.getByLabel("Ask a question").fill("What will sales be next year?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Can’t answer from this data")).toBeVisible({ timeout: 15_000 });
});

test("analyst can save an alert rule", async ({ page }) => {
  await page.goto("/?mode=analyst");
  await page.getByLabel("Rule name").fill("Slow growth");
  await page.getByLabel("Growth below (%)").fill("1");
  await page.getByRole("button", { name: "Save rule" }).click();
  await expect(page.getByText("Rule saved.")).toBeVisible();
  await expect(page.getByRole("list").getByText("Slow growth", { exact: true })).toBeVisible();
});
