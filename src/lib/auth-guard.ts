import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

/**
 * Whether the current request carries a valid Clerk session.
 *
 * This exists for routing only — it decides whether to render a dashboard or
 * bounce to /sign-in. It is NOT the data boundary: every read and write is
 * authorized again inside Convex, which verifies the JWT itself. A caller who
 * skips the UI entirely still cannot reach another user's rows.
 *
 * Deliberately not named `*.server.ts`: Start denies those files to the client
 * graph outright, and route files must import this. The handler body (and its
 * Clerk import) is stripped from the client bundle and replaced by an RPC call.
 */
export const fetchAuthState = createServerFn().handler(async () => {
	const { userId } = await auth();
	return { userId };
});
