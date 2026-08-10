import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { applyThemeMode, readStoredMode, type ThemeMode } from "./theme";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
	light: "dark",
	dark: "auto",
	auto: "light",
};

const ICON: Record<ThemeMode, typeof Sun> = {
	light: Sun,
	dark: Moon,
	auto: Monitor,
};

export default function ThemeToggle() {
	// Starts at "auto" on both server and client, then syncs after mount so the
	// markup matches during hydration. The inline script in __root has already
	// painted the right theme by then.
	const [mode, setMode] = useState<ThemeMode>("auto");

	useEffect(() => {
		setMode(readStoredMode());
	}, []);

	useEffect(() => {
		if (mode !== "auto") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	const Icon = ICON[mode];
	const label = `Theme: ${mode}. Switch to ${NEXT_MODE[mode]}.`;

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={label}
			title={label}
			onClick={() => {
				const next = NEXT_MODE[mode];
				setMode(next);
				applyThemeMode(next);
			}}
		>
			<Icon className="size-4" aria-hidden />
		</Button>
	);
}
