import { useAuth } from "@clerk/tanstack-react-start";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { clientEnv } from "#/env";

/**
 * One client for the whole app. `ConvexProviderWithClerk` feeds it the Clerk
 * JWT, which is what makes `ctx.auth.getUserIdentity()` non-null on the
 * backend. Plain `ConvexProvider` would silently send unauthenticated
 * requests — every authorized query would come back empty.
 *
 * Must be rendered *inside* `<ClerkProvider>`: it calls Clerk's `useAuth`.
 */
const convexClient = new ConvexReactClient(clientEnv.VITE_CONVEX_URL);

export default function AppConvexProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
			{children}
		</ConvexProviderWithClerk>
	);
}
