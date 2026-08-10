import { Show, SignInButton, UserButton } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
			<nav className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
				<Link to="/" className="font-semibold tracking-tight">
					SaaS Starter
				</Link>

				<Show when="signed-in">
					<Link
						to="/dashboard"
						className="text-sm text-muted-foreground transition-colors hover:text-foreground"
						activeProps={{ className: "text-foreground" }}
					>
						Dashboard
					</Link>
				</Show>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<Show when="signed-out">
						<SignInButton mode="modal">
							<Button size="sm">Sign in</Button>
						</SignInButton>
					</Show>
					<Show when="signed-in">
						<UserButton />
					</Show>
				</div>
			</nav>
		</header>
	);
}
