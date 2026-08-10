import { expect, test } from "@playwright/test";

test("the landing page renders", async ({ page }) => {
	const consoleErrors: Array<string> = [];
	page.on("console", (message) => {
		if (message.type() === "error") consoleErrors.push(message.text());
	});

	await page.goto("/");

	await expect(
		page.getByRole("heading", {
			level: 1,
			name: /already knows who the user is/i,
		}),
	).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("a signed-out visitor cannot reach the dashboard", async ({ page }) => {
	await page.goto("/dashboard");

	await expect(page).toHaveURL(/\/sign-in/);
});

test("a signed-out visitor cannot reach the projects page", async ({
	page,
}) => {
	await page.goto("/dashboard/projects");

	await expect(page).toHaveURL(/\/sign-in/);
	// The route we were trying to reach is preserved for the round trip back.
	expect(page.url()).toContain("redirect=");
});
