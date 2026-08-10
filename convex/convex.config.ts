import { defineApp } from "convex/server";
import { v } from "convex/values";

/**
 * Declares the deployment environment so Convex functions can read it through
 * the generated, typed `env` object instead of `process.env`.
 *
 * Two reasons this matters here:
 *  - a missing variable is a type error, not a runtime `undefined`;
 *  - `process` never appears in `convex/`, so the browser TypeScript program —
 *    which pulls every Convex module in through `_generated/api` — does not
 *    need Node globals, and browser code cannot reach for `process.env`.
 *
 * Set values with `pnpm convex env set NAME=value`.
 */
export default defineApp({
	env: {
		/** Absolute app URL, used in emails. */
		APP_URL: v.optional(v.string()),

		/** Email. Unset = messages are logged instead of sent. */
		RESEND_API_KEY: v.optional(v.string()),
		EMAIL_FROM: v.optional(v.string()),

		/** AI providers. Each is only needed by the provider that uses it. */
		ANTHROPIC_API_KEY: v.optional(v.string()),
		OPENAI_API_KEY: v.optional(v.string()),
		GOOGLE_GENERATIVE_AI_API_KEY: v.optional(v.string()),
		OPENROUTER_API_KEY: v.optional(v.string()),
	},
});
