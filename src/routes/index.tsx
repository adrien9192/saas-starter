import { Show, SignUpButton } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/")({ component: LandingPage });

const stack = [
	["TanStack Start", "SSR, file routing, server functions"],
	["Convex", "Database, realtime queries, backend authorization"],
	["Clerk", "Sign-in, sessions, JWT verified by Convex"],
	["TanStack Table & Form", "Typed data grids and forms"],
	["Biome", "One toolchain for lint and format"],
	["Vitest & Playwright", "Unit, authorization and end-to-end tests"],
] as const;

function LandingPage() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-20">
			<section className="max-w-2xl">
				<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
					A SaaS starter that already knows who the user is.
				</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					Type-safe end to end, realtime by default, and free to run while you
					find out whether anyone wants it.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Show when="signed-out">
						<SignUpButton mode="modal">
							<Button size="lg">Get started</Button>
						</SignUpButton>
					</Show>
					<Show when="signed-in">
						<Button size="lg" asChild>
							<Link to="/dashboard">Go to dashboard</Link>
						</Button>
					</Show>
				</div>
			</section>

			<section className="mt-16 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
				{stack.map(([name, description]) => (
					<article key={name} className="bg-background p-5">
						<h2 className="font-medium">{name}</h2>
						<p className="mt-1 text-sm text-muted-foreground">{description}</p>
					</article>
				))}
			</section>
		</main>
	);
}
