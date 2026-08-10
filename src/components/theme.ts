import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

export function readStoredMode(): ThemeMode {
	if (typeof window === "undefined") return "auto";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	return stored === "light" || stored === "dark" || stored === "auto"
		? stored
		: "auto";
}

/**
 * Writes the mode to `<html>` exactly the way the inline script in `__root`
 * does, so a toggle and a page load can never disagree.
 */
export function applyThemeMode(mode: ThemeMode): void {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved: ResolvedTheme =
		mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

	const root = document.documentElement;
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	if (mode === "auto") root.removeAttribute("data-theme");
	else root.setAttribute("data-theme", mode);
	root.style.colorScheme = resolved;

	window.localStorage.setItem(STORAGE_KEY, mode);
}

/**
 * The theme currently painted on `<html>`.
 *
 * Reads the DOM rather than duplicating state, which is why the app needs no
 * theme provider and no second theming library.
 */
export function useResolvedTheme(): ResolvedTheme {
	return useSyncExternalStore(
		(onChange) => {
			const observer = new MutationObserver(onChange);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
			return () => observer.disconnect();
		},
		() =>
			document.documentElement.classList.contains("dark") ? "dark" : "light",
		() => "light",
	);
}
