import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Obtains a Clerk testing token so the bot-protection layer lets automated
 * sign-ins through. Requires `CLERK_SECRET_KEY`; without it the authenticated
 * specs skip themselves and only the smoke tests run.
 */
export default async function globalSetup(): Promise<void> {
	if (!process.env.CLERK_SECRET_KEY) {
		console.warn(
			"CLERK_SECRET_KEY is not set — authenticated e2e specs will be skipped.",
		);
		return;
	}
	await clerkSetup();
}
