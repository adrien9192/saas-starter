import type { PostHog } from "posthog-js";
import { clientEnv } from "#/env";

/**
 * The only place the app names an analytics event.
 *
 * Keeping the union here means a typo is a type error, and swapping PostHog for
 * something else is one file.
 *
 * PostHog is loaded lazily, and only when a key is configured: the SDK is ~90 kB
 * gzipped, and a fresh clone has no key, so a static import would put a tenth
 * of the initial bundle behind a feature that is switched off. Nothing here
 * throws or awaits — analytics must never delay or break an interaction.
 */
export type AnalyticsEvent =
	| { name: "project_created" }
	| { name: "project_renamed" }
	| { name: "project_deleted" };

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;

function load(): Promise<PostHog | null> {
	if (loading !== null) return loading;

	const key = clientEnv.VITE_POSTHOG_KEY;
	if (typeof window === "undefined" || !key) {
		loading = Promise.resolve(null);
		return loading;
	}

	// Exception to the static-import rule: this module is ~90 kB gzipped and
	// must stay out of the initial chunk when analytics is disabled.
	loading = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: clientEnv.VITE_POSTHOG_HOST,
			person_profiles: "identified_only",
			defaults: "2025-11-30",
		});
		client = posthog;
		return posthog;
	});
	return loading;
}

export function track(event: AnalyticsEvent): void {
	void load().then((posthog) => posthog?.capture(event.name));
}

/**
 * Associates the session with a user. Only the Convex user id is sent — no
 * email, no name.
 */
export function identify(userId: string): void {
	void load().then((posthog) => posthog?.identify(userId));
}

export function resetIdentity(): void {
	client?.reset();
}
