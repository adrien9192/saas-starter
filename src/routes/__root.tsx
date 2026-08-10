import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import Footer from "#/components/Footer";
import Header from "#/components/Header";
import { Toaster } from "#/components/ui/sonner";
import { SessionBootstrap } from "#/features/auth/session-bootstrap";
import "#/integrations/sentry/client";
import ClerkProvider from "#/integrations/clerk/provider";
import ConvexProvider from "#/integrations/convex/provider";
import appCss from "#/styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "SaaS Starter" },
			{
				name: "description",
				content: "TanStack Start + Convex + Clerk SaaS starter.",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

/**
 * Provider order is load-bearing:
 * Clerk must wrap Convex, because `ConvexProviderWithClerk` reads Clerk's
 * `useAuth` to obtain the JWT it sends on every request.
 */
function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Applies the stored theme before first paint to avoid a flash. */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme script must run before hydration
					dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
				/>
				<HeadContent />
			</head>
			<body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
				<ClerkProvider>
					<ConvexProvider>
						<SessionBootstrap />
						<Header />
						<div className="flex-1">{children}</div>
						<Footer />
						<Toaster />
						<TanStackDevtools
							config={{ position: "bottom-right" }}
							plugins={[
								{
									name: "TanStack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					</ConvexProvider>
				</ClerkProvider>
				<Scripts />
			</body>
		</html>
	);
}
