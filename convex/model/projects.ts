/**
 * Project domain rules.
 *
 * Imported by both the Convex functions and the client form so the constraint
 * has exactly one definition. The server is still the one that enforces it —
 * the client import only keeps the UI honest.
 */

/**
 * Rows returned by `projects.list` in one call.
 *
 * The table filters and sorts on the client, which is the right trade for a
 * few hundred rows and keeps search instant. It also means the page must hold
 * every row it claims to search — so instead of truncating in silence, the
 * query reports `hasMore` and the UI says so out loud.
 *
 * Past this point, move filtering and sorting into Convex and switch to
 * `.paginate()`. Doing it earlier would make search silently partial, which is
 * a worse bug than the one it fixes.
 */
export const PROJECT_LIST_LIMIT = 200;

export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 80;

export type ProjectNameError = "empty" | "too_long";

/** Collapses whitespace and trims. */
export function normalizeProjectName(raw: string): string {
	return raw.replace(/\s+/gu, " ").trim();
}

/** Returns why a normalized name is unacceptable, or `null` when it is fine. */
export function validateProjectName(raw: string): ProjectNameError | null {
	const name = normalizeProjectName(raw);
	if (name.length < PROJECT_NAME_MIN_LENGTH) return "empty";
	if (name.length > PROJECT_NAME_MAX_LENGTH) return "too_long";
	return null;
}

export function projectNameErrorMessage(error: ProjectNameError): string {
	switch (error) {
		case "empty":
			return "Name is required.";
		case "too_long":
			return `Name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`;
	}
}
