import { init } from "@sentry/tanstackstart-react";
import { clientEnv } from "#/env";

/**
 * Browser-side error reporting.
 *
 * Server-side init lives in `instrument.server.mjs`, loaded through
 * `NODE_OPTIONS --import` before anything else so it can instrument the
 * runtime.
 *
 * With no `VITE_SENTRY_DSN` this does nothing at all: no SDK start, no network,
 * no PII. The app is expected to run that way in development and in CI.
 */
if (typeof window !== "undefined" && clientEnv.VITE_SENTRY_DSN) {
	init({
		dsn: clientEnv.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		tracesSampleRate: 0.1,
		// Opt in explicitly rather than shipping user content by default.
		dataCollection: { userInfo: false, httpBodies: [] },
	});
}
