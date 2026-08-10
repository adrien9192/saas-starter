# Project

A production-ready SaaS starter: TanStack Start + Convex + Clerk, type-safe end
to end, realtime by default, running on free tiers.

`AGENTS.md` holds the generated TanStack Intent skill mappings and the Convex
guidance block. This file holds the rules that are specific to this repo.

# Stack

TanStack Start 1.168 · React 19 · TypeScript 6 (strict) · Convex 1.43 ·
Clerk 1.4 · Tailwind 4 · shadcn/ui · TanStack Table 9 · TanStack Form 1.33 ·
Biome 2 · Vitest 4 · Playwright 1.62 · Vite 8 + Nitro.

# Commands

```
pnpm dev         # app on :3000
pnpm convex      # Convex dev deployment, watch + codegen (run alongside)
pnpm typecheck   # routes + three TS programs (app, convex, node tooling)
pnpm lint        # biome check
pnpm format      # biome check --write
pnpm test        # vitest: convex authorization + unit
pnpm verify      # typecheck → lint → test → build
pnpm test:e2e    # playwright; needs E2E_BASE_URL and a running app
pnpm email       # React Email preview on :3001
```

# Architecture

Three TypeScript programs, on purpose: `tsconfig.json` (browser),
`convex/tsconfig.json` (backend, has Node types), `tsconfig.node.json` (configs
and e2e). Node globals must never become reachable from browser code.

- `src/routes/` — file-based routes. `_authenticated/` is behind a guard.
- `src/features/<domain>/` — feature UI. `src/components/ui/` is shadcn only.
- `convex/` — schema, queries, mutations, actions. `convex/model/` holds
  helpers that are not themselves Convex functions.
- `emails/` — React Email templates, rendered by a Convex action.

# TanStack

Before touching TanStack code:

1. identify the package;
2. load its installed Agent Skill — `pnpm exec intent list`, then
   `pnpm dlx @tanstack/intent@latest load <package>#<skill>`;
3. when still unsure, read the current docs (`pnpm exec tanstack search-docs`);
4. never assume an API from memory when it can be verified.

Table is **v9**: `useTable`, `tableFeatures`, `table.FlexRender`, `sortFn`.
v8 (`useReactTable`, `getCoreRowModel`, `sortingFn`) does not apply.

This is enforced, not suggested: `.claude/settings.json` runs
`.intent/hooks/intent-claude-gate.mjs` on `PreToolUse`, and it **denies** an edit
until a skill has been loaded in the session. Verified: deny → `intent load …` →
allow. One load per session opens the gate; state lives in the OS temp dir, not
the repo.

# Convex

- Convex is the only source of truth for application data.
- Backend authorization is mandatory. Identity comes from
  `ctx.auth.getUserIdentity()`, never from an argument.
- Every `_id` argument in a public function must be ownership-checked before
  the row is read or written — see `convex/model/auth.ts`.
- Use `pnpm convex` codegen; never hand-edit `convex/_generated/`.
- The MCP server is wired to the **dev** deployment only. Production is never
  modified without an explicit request.
- **One Convex MCP, not two.** `.mcp.json` in this repo registers `convex`
  pinned to `--deployment dev`. The official Convex Claude Code plugin
  registers its own `convex` server *without* that pin, so having both gives
  you duplicated tools, one of which is not dev-restricted. If the plugin is
  installed (`claude mcp list` shows `plugin:convex:convex`), delete
  `.mcp.json`; otherwise keep it and do not install the plugin's MCP.

# Auth

Clerk owns sessions; Convex verifies the JWT itself. Route guards
(`beforeLoad`) are navigation only — they do not protect data. Never trust a
client-supplied owner id.

Provider order in `__root.tsx` is load-bearing: Clerk wraps Convex, because
`ConvexProviderWithClerk` reads Clerk's `useAuth`.

# Forms and tables

TanStack Form and TanStack Table. Do not add React Hook Form, Formik, or a
second table library.

# Data fetching

Convex data uses Convex's own `useQuery`/`useMutation` — it is already reactive
and cached. TanStack Query is **not installed**: adding it for Convex data
would mean two caches over the same rows. Install it only for external HTTP
APIs, and only for those.

# Validation

Convex validators own the backend boundary. Zod owns untrusted external input:
client env (`src/env.ts`), webhooks, AI structured output. Shared domain rules
live once, in `convex/model/`, and are imported by both sides. Never describe
the same value three times.

# External services

Every provider is behind one small module: email in `convex/emails.ts`,
analytics in `src/lib/analytics.ts`, AI in `convex/model/ai.ts`. Swapping a
provider should touch one file.

# Free-first

Never add a paid dependency when a good free option satisfies the requirement
without documenting why. Never enable a feature that requires a paid plan
without flagging it. See "Free tier assumptions" in the README.

# Observability

Sentry initialises in two places: `instrument.server.mjs` (server, loaded via
`NODE_OPTIONS --import`) and `src/integrations/sentry/client.ts` (browser).
Both no-op without `VITE_SENTRY_DSN`. To trace a slow server function, wrap its
body:

```ts
import * as Sentry from "@sentry/tanstackstart-react";
Sentry.startSpan({ name: "describe the work" }, async () => { … });
```

Analytics events are declared as a union in `src/lib/analytics.ts`. PostHog is
loaded lazily and only when `VITE_POSTHOG_KEY` is set — do not turn that into a
static import, it costs ~90 kB gzipped in the initial chunk.

# Testing

Vitest for authorization and logic, Playwright for flows. The authorization
tests in `convex/projects.test.ts` are load-bearing: if you change
`convex/model/auth.ts`, they must still fail when the ownership check is
removed.

# Verification

After a significant change: `pnpm verify`, then a browser smoke test when the
UI changed. A green build is not evidence that the app works.

# Safety

- Never commit secrets; `.env.local` is gitignored and stays that way.
- Never delete production data to fix a bug.
- Never use `any` or `@ts-ignore` to silence a legitimate error.
- Never weaken an authorization check for convenience.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
