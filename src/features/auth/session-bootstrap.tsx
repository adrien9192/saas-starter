import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { identify, resetIdentity } from "#/lib/analytics";
import { api } from "~convex/_generated/api";

/**
 * Mirrors the Clerk identity into Convex once the websocket is authenticated,
 * and keeps the analytics identity in step.
 *
 * Renders nothing. It has to be a component because it depends on Convex auth
 * state, and it must run before any mutation that needs a `users` row.
 */
export function SessionBootstrap() {
	const { isAuthenticated } = useConvexAuth();
	const ensureCurrentUser = useMutation(api.users.ensureCurrent);

	useEffect(() => {
		if (!isAuthenticated) {
			resetIdentity();
			return;
		}
		let cancelled = false;
		void ensureCurrentUser().then((userId) => {
			if (!cancelled) identify(userId);
		});
		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, ensureCurrentUser]);

	return null;
}
