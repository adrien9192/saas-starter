import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { track } from "#/lib/analytics";
import { api } from "~convex/_generated/api";
import type { Doc } from "~convex/_generated/dataModel";
import { ProjectNameForm } from "./project-name-form";

/** Surfaces a Convex `ConvexError` payload, or a generic fallback. */
function toastError(error: unknown, fallback: string): void {
	const data = (error as { data?: { message?: string } } | undefined)?.data;
	toast.error(data?.message ?? fallback);
}

export function CreateProjectDialog() {
	const [open, setOpen] = useState(false);
	const createProject = useMutation(api.projects.create);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>New project</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New project</DialogTitle>
					<DialogDescription>
						Projects are private to your account.
					</DialogDescription>
				</DialogHeader>
				<ProjectNameForm
					submitLabel="Create"
					onCancel={() => setOpen(false)}
					onSubmit={async (name) => {
						try {
							await createProject({ name });
							track({ name: "project_created" });
							setOpen(false);
						} catch (error) {
							toastError(error, "Could not create the project.");
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}

export function RenameProjectDialog({
	project,
	open,
	onOpenChange,
}: {
	project: Doc<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const renameProject = useMutation(api.projects.rename);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename project</DialogTitle>
					<DialogDescription>
						This changes the name everywhere it appears.
					</DialogDescription>
				</DialogHeader>
				<ProjectNameForm
					initialName={project.name}
					submitLabel="Save"
					onCancel={() => onOpenChange(false)}
					onSubmit={async (name) => {
						try {
							await renameProject({ projectId: project._id, name });
							track({ name: "project_renamed" });
							onOpenChange(false);
						} catch (error) {
							toastError(error, "Could not rename the project.");
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteProjectDialog({
	project,
	open,
	onOpenChange,
}: {
	project: Doc<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const removeProject = useMutation(api.projects.remove);
	const [isDeleting, setIsDeleting] = useState(false);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
					<AlertDialogDescription>
						This cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={isDeleting}
						onClick={async (event) => {
							event.preventDefault();
							setIsDeleting(true);
							try {
								await removeProject({ projectId: project._id });
								track({ name: "project_deleted" });
								onOpenChange(false);
							} catch (error) {
								toastError(error, "Could not delete the project.");
							} finally {
								setIsDeleting(false);
							}
						}}
					>
						{isDeleting ? "Deleting…" : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
