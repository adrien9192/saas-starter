import { defineConfig } from "vitest/config";

/**
 * Two projects because the two halves of the app need different runtimes:
 * Convex functions run in an edge-like V8 isolate, React components need a DOM.
 * Playwright is deliberately not here — it needs a built app and a browser.
 */
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		projects: [
			{
				resolve: { tsconfigPaths: true },
				test: {
					name: "convex",
					include: ["convex/**/*.test.ts"],
					environment: "edge-runtime",
					server: { deps: { inline: ["convex-test"] } },
				},
			},
			{
				resolve: { tsconfigPaths: true },
				test: {
					name: "unit",
					include: ["src/**/*.test.{ts,tsx}"],
					environment: "jsdom",
					globals: true,
					setupFiles: ["./src/test-setup.ts"],
				},
			},
		],
	},
});
