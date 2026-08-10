import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright never starts the app itself: the dev/preview server is owned by
 * whatever supervises processes in your environment (your terminal, Portly, a
 * CI step). Point the tests at it with `E2E_BASE_URL`.
 *
 *   pnpm dev            # terminal 1
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
 *
 * Kept out of `pnpm verify`: it needs a running app and a browser, which is a
 * different kind of slow than typecheck and unit tests.
 */
const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
	throw new Error(
		"E2E_BASE_URL is required. Start the app first, then run:\n" +
			"  E2E_BASE_URL=http://localhost:3000 pnpm test:e2e",
	);
}

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
