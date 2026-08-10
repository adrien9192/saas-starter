import { z } from "zod";

/**
 * Client environment, validated once at module load.
 *
 * Only `VITE_`-prefixed variables belong here: Vite inlines them into the
 * browser bundle, so anything listed is public by construction. Server secrets
 * (Clerk's secret key, Resend, Stripe) are read by their own SDKs from
 * `process.env` on the server, or live in the Convex deployment environment —
 * never in this file.
 *
 * Each variable is spelled out rather than spreading `import.meta.env` so Vite
 * can statically replace it at build time.
 */
const clientEnvSchema = z.object({
	VITE_CONVEX_URL: z.url("VITE_CONVEX_URL must be the Convex deployment URL"),
	VITE_APP_URL: z.url().default("http://localhost:3000"),
	VITE_POSTHOG_KEY: z.string().min(1).optional(),
	VITE_POSTHOG_HOST: z.url().default("https://eu.i.posthog.com"),
	VITE_SENTRY_DSN: z.string().min(1).optional(),
});

const parsed = clientEnvSchema.safeParse({
	VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
	VITE_APP_URL: import.meta.env.VITE_APP_URL,
	VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
	VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
	VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
});

if (!parsed.success) {
	throw new Error(
		`Invalid client environment:\n${z.prettifyError(parsed.error)}\n\nCopy .env.example to .env.local and fill it in.`,
	);
}

export const clientEnv = parsed.data;
