import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardLayout,
});

const navigation = [
	{ to: "/dashboard", label: "Overview", exact: true },
	{ to: "/dashboard/projects", label: "Projects", exact: false },
] as const;

function DashboardLayout() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row">
			<nav aria-label="Dashboard" className="md:w-48 md:shrink-0">
				<ul className="flex gap-1 md:flex-col">
					{navigation.map((item) => (
						<li key={item.to}>
							<Link
								to={item.to}
								activeOptions={{ exact: item.exact }}
								className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								activeProps={{
									className: "bg-muted font-medium text-foreground",
								}}
							>
								{item.label}
							</Link>
						</li>
					))}
				</ul>
			</nav>
			<div className="min-w-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}
