import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		// `removeDevtoolsOnBuild` already defaults to true, but a starter should not
		// leave "no devtools panel in production" to a default it does not state.
		// Verified on a production build: zero occurrences of `TanStackDevtools`
		// or `@tanstack/react-devtools` in .output/public.
		devtools({ removeDevtoolsOnBuild: true }),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
