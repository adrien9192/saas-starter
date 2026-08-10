import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { api } from "~convex/_generated/api";

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: DashboardOverview,
});

function DashboardOverview() {
	const user = useQuery(api.users.current);
	const projects = useQuery(api.projects.list);
	const projectCount =
		projects === undefined
			? "—"
			: `${projects.projects.length}${projects.hasMore ? "+" : ""}`;

	return (
		<div className="space-y-6">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">
					{user?.name ? `Welcome back, ${user.name}` : "Welcome back"}
				</h1>
				<p className="text-muted-foreground">
					Everything below is scoped to your account.
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2">
				<Link to="/dashboard/projects" className="block">
					<Card className="transition-colors hover:border-foreground/20">
						<CardHeader>
							<CardDescription>Projects</CardDescription>
							<CardTitle className="text-3xl tabular-nums">
								{projectCount}
							</CardTitle>
						</CardHeader>
					</Card>
				</Link>
			</div>
		</div>
	);
}
