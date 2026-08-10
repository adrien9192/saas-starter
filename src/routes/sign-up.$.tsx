import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
			<SignUp
				routing="path"
				path="/sign-up"
				signInUrl="/sign-in"
				forceRedirectUrl="/dashboard"
			/>
		</main>
	);
}
