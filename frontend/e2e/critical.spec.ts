import { expect, test } from "@playwright/test";

const publicForm = {
  organization_name: "Établissement E2E",
  organization_logo_url: "",
  visit_reasons: ["Rendez-vous"],
  fields_schema: [{ id: "nom", type: "text", label: "Nom", required: true }],
  form_id: "form-e2e",
  form_title: "Registre E2E",
  access_point_id: null,
  access_point_name: "Accueil",
};

test.describe("parcours publics et authentification", () => {
  test("landing et connexion sont disponibles", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/REKOLLECTE/);
    await page.goto("/connexion");
    await expect(page.getByRole("heading", { name: "Connecte-toi à ton espace" })).toBeVisible();
  });

  test("un QR public charge le formulaire et gère une suspension", async ({ page }) => {
    await page.route("**/*", async (route) => {
      if (route.request().url().includes("/public/forms/e2e-token")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(publicForm) });
      } else {
        await route.continue();
      }
    });
    await page.goto("/v/e2e-token");
    await expect(page.getByText("Établissement E2E")).toBeVisible();

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.route("**/*", async (route) => {
      if (route.request().url().includes("/public/forms/suspended-token")) {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { message: "Formulaire indisponible", retryable: false } }) });
      } else {
        await route.continue();
      }
    });
    await page.goto("/v/suspended-token");
    await expect(page.getByText("QR Code invalide")).toBeVisible();
  });
});

test.describe("session, formulaires et QR authentifiés", () => {
  test.skip(!process.env.E2E_AUTH_TOKEN, "Définir E2E_AUTH_TOKEN pour la recette staging authentifiée");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      (window as Window & { __E2E_TOKEN?: string }).__E2E_TOKEN = token;
    }, process.env.E2E_AUTH_TOKEN);
  });

  test("refresh conserve la session dashboard", async ({ page }) => {
    await page.goto("/dashboard/parametres/formulaire");
    await expect(page.getByText(/formulaire/i).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("création des formulaires et QR est accessible sur mobile", async ({ page }) => {
    await page.goto("/dashboard/parametres/formulaire");
    await expect(page.getByRole("button", { name: /créer un formulaire/i })).toBeVisible();
    await page.goto("/dashboard/parametres/qr-code");
    await expect(page.getByRole("button", { name: /créer un QR/i })).toBeVisible();
  });
});
