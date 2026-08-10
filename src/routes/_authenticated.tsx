import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchAuthState } from "#/lib/auth-guard";

/**
 * Pathless layout guard. Anything under `src/routes/_authenticated/` requires a
 * session; unauthenticated visitors are sent to sign-in and returned here
 * afterwards.
 *
 * The guard is a navigation concern. Authorization lives in Convex.
 */
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location }) => {
		const { userId } = await fetchAuthState();
		if (userId === null) {
			throw redirect({
				to: "/sign-in/$",
				params: { _splat: "" },
				search: { redirect: location.href },
			});
		}
		return { userId };
	},
});
