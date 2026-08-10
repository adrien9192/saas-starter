import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

/**
 * The full Projects slice, driven through the UI as a real signed-in user.
 *
 * Needs a Clerk test account. Create one in the Clerk dashboard (or let
 * `scripts/create-e2e-user.ts` do it) and put the credentials in `.env.local`:
 *   E2E_CLERK_USER_EMAIL=…
 *   E2E_CLERK_USER_PASSWORD=…
 */
const email = process.env.E2E_CLERK_USER_EMAIL;
const password = process.env.E2E_CLERK_USER_PASSWORD;

test.describe("projects", () => {
	test.skip(
		!email || !password || !process.env.CLERK_SECRET_KEY,
		"Set CLERK_SECRET_KEY, E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to run authenticated tests.",
	);

	test.beforeEach(async ({ page }) => {
		await setupClerkTestingToken({ page });

		await page.goto("/sign-in");
		await page.getByLabel(/email/i).fill(email as string);
		await page.getByRole("button", { name: /continue/i }).click();
		await page.getByLabel(/password/i).fill(password as string);
		await page.getByRole("button", { name: /continue/i }).click();

		await page.waitForURL(/\/dashboard/);
		await page.goto("/dashboard/projects");
	});

	test("create, rename, search and delete a project", async ({ page }) => {
		const original = `E2E project ${Date.now()}`;
		const renamed = `${original} renamed`;

		await page.getByRole("button", { name: "New project" }).click();
		await page.getByLabel("Name").fill(original);
		await page.getByRole("button", { name: "Create" }).click();
		await expect(page.getByRole("cell", { name: original })).toBeVisible();

		// Search narrows the table without a round trip.
		await page.getByLabel("Search projects").fill("nothing-matches-this");
		await expect(page.getByRole("cell", { name: original })).toBeHidden();
		await page.getByLabel("Search projects").clear();

		await page.getByRole("button", { name: `Actions for ${original}` }).click();
		await page.getByRole("menuitem", { name: "Rename" }).click();
		await page.getByLabel("Name").fill(renamed);
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByRole("cell", { name: renamed })).toBeVisible();

		await page.getByRole("button", { name: `Actions for ${renamed}` }).click();
		await page.getByRole("menuitem", { name: "Delete" }).click();
		await page.getByRole("button", { name: "Delete" }).click();
		await expect(page.getByRole("cell", { name: renamed })).toBeHidden();
	});

	test("an empty name is rejected before submitting", async ({ page }) => {
		await page.getByRole("button", { name: "New project" }).click();
		await page.getByLabel("Name").fill("x");
		await page.getByLabel("Name").clear();

		await expect(page.getByRole("alert")).toContainText("Name is required");
		await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
	});
});
