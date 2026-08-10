import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	PROJECT_NAME_MAX_LENGTH,
	projectNameErrorMessage,
	validateProjectName,
} from "~convex/model/projects";

/**
 * The single "name a project" form, shared by create and rename.
 *
 * Validation reuses the same rules the Convex mutation enforces — the client
 * never redefines them, it just avoids a round-trip for obvious mistakes.
 */
export function ProjectNameForm({
	initialName = "",
	submitLabel,
	onSubmit,
	onCancel,
}: {
	initialName?: string;
	submitLabel: string;
	onSubmit: (name: string) => Promise<void>;
	onCancel: () => void;
}) {
	const fieldId = useId();

	const form = useForm({
		defaultValues: { name: initialName },
		onSubmit: async ({ value }) => {
			await onSubmit(value.name);
		},
	});

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field
				name="name"
				validators={{
					onChange: ({ value }) => {
						const error = validateProjectName(value);
						return error === null ? undefined : projectNameErrorMessage(error);
					},
				}}
			>
				{(field) => {
					const error = field.state.meta.isTouched
						? field.state.meta.errors[0]
						: undefined;
					return (
						<div className="space-y-2">
							<Label htmlFor={fieldId}>Name</Label>
							<Input
								id={fieldId}
								name={field.name}
								value={field.state.value}
								maxLength={PROJECT_NAME_MAX_LENGTH}
								autoComplete="off"
								aria-invalid={error !== undefined}
								aria-describedby={
									error === undefined ? undefined : `${fieldId}-error`
								}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
							{error === undefined ? null : (
								<p
									id={`${fieldId}-error`}
									role="alert"
									className="text-sm text-destructive"
								>
									{String(error)}
								</p>
							)}
						</div>
					);
				}}
			</form.Field>

			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ canSubmit, isSubmitting }) => (
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Saving…" : submitLabel}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
