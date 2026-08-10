import {
	columnFilteringFeature,
	createColumnHelper,
	createFilteredRowModel,
	createSortedRowModel,
	filterFn_includesString,
	globalFilteringFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ChevronsUpDown,
	MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { Doc } from "~convex/_generated/dataModel";
import { DeleteProjectDialog, RenameProjectDialog } from "./project-dialogs";

type Project = Doc<"projects">;

/**
 * Only the features this table actually uses. v9 installs state and methods
 * per registered feature, so an unregistered feature is a type error rather
 * than a silent no-op at runtime.
 */
const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns: { includesString: filterFn_includesString },
});

const columnHelper = createColumnHelper<typeof features, Project>();

const dateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: "Name",
		sortFn: "alphanumeric",
		filterFn: "includesString",
	}),
	columnHelper.accessor((project) => project._creationTime, {
		id: "createdAt",
		header: "Created",
		sortFn: "basic",
		enableGlobalFilter: false,
		cell: ({ getValue }) => dateFormat.format(getValue()),
	}),
	columnHelper.accessor((project) => project.updatedAt, {
		id: "updatedAt",
		header: "Updated",
		sortFn: "basic",
		enableGlobalFilter: false,
		cell: ({ getValue }) => dateFormat.format(getValue()),
	}),
	columnHelper.display({
		id: "actions",
		header: "",
		cell: ({ row }) => <RowActions project={row.original} />,
	}),
]);

/** Stable ids, used for skeleton keys and empty-state `colSpan`. */
const COLUMN_IDS = ["name", "createdAt", "updatedAt", "actions"];

/** Module scope: a fresh array each render would invalidate the row models. */
const NO_PROJECTS: Array<Project> = [];

export function ProjectsTable({
	projects,
}: {
	projects: Array<Project> | undefined;
}) {
	const [globalFilter, setGlobalFilter] = useState("");

	const table = useTable({
		features,
		columns,
		data: projects ?? NO_PROJECTS,
		getRowId: (project) => project._id,
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: "includesString",
		initialState: { sorting: [{ id: "updatedAt", desc: true }] },
	});

	const isLoading = projects === undefined;
	const rows = table.getRowModel().rows;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<Input
					value={globalFilter}
					onChange={(event) => setGlobalFilter(event.target.value)}
					placeholder="Search projects…"
					aria-label="Search projects"
					className="max-w-xs"
					disabled={isLoading}
				/>
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{isLoading
						? "Loading…"
						: `${rows.length} of ${projects.length} project${projects.length === 1 ? "" : "s"}`}
				</p>
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const canSort = header.column.getCanSort();
									const direction = header.column.getIsSorted();
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder ? null : canSort ? (
												<button
													type="button"
													className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted"
													onClick={header.column.getToggleSortingHandler()}
													aria-label={`Sort by ${String(header.column.columnDef.header)}`}
												>
													<table.FlexRender header={header} />
													{direction === "asc" ? (
														<ArrowUp className="size-3.5" aria-hidden />
													) : direction === "desc" ? (
														<ArrowDown className="size-3.5" aria-hidden />
													) : (
														<ChevronsUpDown
															className="size-3.5 opacity-40"
															aria-hidden
														/>
													)}
												</button>
											) : (
												<table.FlexRender header={header} />
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<LoadingRows columnIds={COLUMN_IDS} />
						) : rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={COLUMN_IDS.length}
									className="h-32 text-center text-muted-foreground"
								>
									{projects.length === 0
										? "No projects yet. Create your first one."
										: `Nothing matches “${globalFilter}”.`}
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow key={row.id}>
									{row.getAllCells().map((cell) => (
										<TableCell key={cell.id}>
											<table.FlexRender cell={cell} />
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

/** Placeholder rows shown while the first Convex snapshot is in flight. */
function LoadingRows({ columnIds }: { columnIds: Array<string> }) {
	return (
		<>
			{["a", "b", "c"].map((rowKey) => (
				<TableRow key={rowKey}>
					{columnIds.map((columnId) => (
						<TableCell key={columnId}>
							<div className="h-4 w-full max-w-40 animate-pulse rounded bg-muted" />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}

function RowActions({ project }: { project: Project }) {
	const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

	return (
		<div className="flex justify-end">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions for ${project.name}`}
					>
						<MoreHorizontal className="size-4" aria-hidden />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => setDialog("rename")}>
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => setDialog("delete")}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<RenameProjectDialog
				project={project}
				open={dialog === "rename"}
				onOpenChange={(open) => setDialog(open ? "rename" : null)}
			/>
			<DeleteProjectDialog
				project={project}
				open={dialog === "delete"}
				onOpenChange={(open) => setDialog(open ? "delete" : null)}
			/>
		</div>
	);
}
