import { expect, test } from "@playwright/test";

test.describe("grille tarifaire de la landing", () => {
  test("annonce la gratuité jusqu'au 1er décembre 2026 et les quatre offres", async ({ page }) => {
    await page.goto("/");
    const grille = page.locator("#tarifs");
    await grille.scrollIntoViewIfNeeded();
    await expect(grille.getByRole("heading", { level: 2 })).toContainText(/Tout est gratuit jusqu.au 1er décembre 2026/);
    for (const nom of ["Gratuit", "Essentiel", "REKOLLECTE+", "Entreprise"]) {
      await expect(grille.getByRole("heading", { name: nom, level: 3 })).toBeVisible();
    }
    await expect(grille).toContainText(/3\s000/);
    await expect(grille).toContainText(/7\s000/);
    await expect(grille).toContainText("Sur devis");
  });

  test("pendant la période de lancement, les prix payants sont barrés et l'usage est libre", async ({ page }) => {
    await page.goto("/");
    const grille = page.locator("#tarifs");
    await grille.scrollIntoViewIfNeeded();
    await expect(grille.locator("s")).toHaveCount(2); // Essentiel et REKOLLECTE+
    await expect(grille.getByText(/Usage libre jusqu.au 1er décembre 2026/).first()).toBeVisible();
  });

  test("ne crée pas de défilement horizontal (téléphone compris)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tarifs").scrollIntoViewIfNeeded();
    const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debordement).toBeLessThanOrEqual(1);
  });
});
