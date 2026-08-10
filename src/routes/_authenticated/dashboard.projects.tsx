import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CreateProjectDialog } from "#/features/projects/project-dialogs";
import { ProjectsTable } from "#/features/projects/projects-table";
import { api } from "~convex/_generated/api";

export const Route = createFileRoute("/_authenticated/dashboard/projects")({
	component: ProjectsPage,
});

function ProjectsPage() {
	// Convex subscribes over a websocket: another tab creating a project updates
	// this list without a refetch. `undefined` means "still loading".
	const projects = useQuery(api.projects.list);

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
					<p className="text-muted-foreground">
						Create, rename and delete your projects.
					</p>
				</div>
				<CreateProjectDialog />
			</header>

			<ProjectsTable projects={projects} />
		</div>
	);
}
