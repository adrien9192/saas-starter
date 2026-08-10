/**
 * Project domain rules.
 *
 * Imported by both the Convex functions and the client form so the constraint
 * has exactly one definition. The server is still the one that enforces it —
 * the client import only keeps the UI honest.
 */

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
