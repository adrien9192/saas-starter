import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Catch-all so Clerk can own its own sub-routes (verification, SSO callback,
 * factor-two) under /sign-in.
 */
export const Route = createFileRoute("/sign-in/$")({
	validateSearch: z.object({ redirect: z.string().optional() }),
	component: SignInPage,
});

function SignInPage() {
	const { redirect } = Route.useSearch();
	return (
		<main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
			<SignIn
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
				forceRedirectUrl={redirect ?? "/dashboard"}
			/>
		</main>
	);
}
