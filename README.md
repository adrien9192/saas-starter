# SaaS Starter

TanStack Start + Convex + Clerk. Type-safe end to end, realtime by default,
and designed to run at €0/month while you find out whether anyone wants it.

Ships with a working vertical slice — authenticated CRUD over a `projects`
table, with authorization enforced in the backend and proved by tests.

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start 1.168 (Vite 8 + Nitro), React 19, TypeScript 6 strict |
| Routing | TanStack Router (file-based, typed) |
| Backend & data | Convex 1.43 — database, realtime queries, mutations, actions, scheduling, file storage |
| Auth | Clerk 1.4 (`@clerk/tanstack-react-start`), JWT verified by Convex |
| UI | Tailwind 4, shadcn/ui, Lucide |
| Tables & forms | TanStack Table 9, TanStack Form 1.33 |
| Email | React Email 6 + Resend, behind one swappable function |
| Analytics | PostHog (optional) |
| Errors | Sentry (optional) |
| AI | AI SDK 7, multi-provider, no key required |
| Quality | Biome 2, Vitest 4, Playwright 1.62 |
| CI | GitHub Actions |

## Setup

Requires Node 22+ and pnpm 10+ (`corepack enable pnpm`).

```bash
pnpm install
cp .env.example .env.local
```

### 1. Convex

```bash
pnpm convex          # creates a dev deployment, writes CONVEX_DEPLOYMENT and
                     # VITE_CONVEX_URL into .env.local, then watches for changes
```

Leave it running in its own terminal — it is the codegen and deploy loop.

### 2. Clerk

Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) — development
instances are free and unlimited — and copy both keys into `.env.local`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
```

### 3. Wire Clerk to Convex

```bash
pnpm bootstrap
```

That does the three steps that are easy to get wrong, from the keys alone:

1. derives the Clerk issuer domain from the publishable key;
2. creates the `convex` JWT template — **with the profile claims**, not just `aud`.
   A template carrying only `aud` authenticates perfectly and silently leaves every
   user without a name or email;
3. sets `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment. Skip this and everything
   renders while every Convex query behaves as if nobody is signed in.

It is idempotent, refuses live keys and non-`dev:` deployments, and is **additive**:
an existing template keeps every claim it already has.

<details>
<summary>Doing it by hand instead</summary>

**Dashboard → JWT templates → New template → Convex**, claims:

```json
{
  "aud": "convex",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.full_name}}",
  "picture": "{{user.image_url}}"
}
```

then `pnpm convex env set CLERK_JWT_ISSUER_DOMAIN=https://<your-app>.clerk.accounts.dev`.

</details>

### 4. Verify the chain before building on it

```bash
npx dotenv -e .env.local -- node scripts/verify-auth-chain.mjs
```

Ten checks against the live dev deployment with two real Clerk users and real JWTs,
including cross-tenant isolation. Everything it creates, it deletes.

> **Reusing one Clerk application across several projects.** It works, and
> `pnpm bootstrap` is safe to run against a shared template. But one Clerk
> application is one user database: accounts, the JWT template and the 50,000 MAU
> allowance are shared across every project using those keys. Whether a session also
> carries from one product to the other depends on your Clerk domain configuration —
> but the shared account pool alone is a coupling with nothing to offset it.
> Development instances cost nothing — share keys only between environments of the
> *same* product.
>
> The Convex CLI token in `~/.convex/config.json` is different: it is account-level,
> so reuse it freely. Each project still gets its own Convex project and its own quota.

### 5. Run

```bash
pnpm dev             # http://localhost:3000  (PORT=4000 pnpm dev to move it)
```

## Commands

```
pnpm dev         # dev server
pnpm convex      # Convex dev deployment (run alongside)
pnpm bootstrap   # wire Clerk <-> Convex (idempotent)
pnpm build       # production build into .output/
pnpm start       # run the built server
pnpm typecheck   # routes + 3 TS programs: app, convex, node tooling
pnpm lint        # biome check
pnpm format      # biome check --write
pnpm test        # vitest: authorization + unit
pnpm test:e2e    # playwright (needs E2E_BASE_URL and a running app)
pnpm verify      # typecheck → lint → test → build
pnpm email       # React Email preview on :3001
```

## Testing

`pnpm test` runs two Vitest projects: Convex functions in an edge runtime, and
React code in jsdom.

The authorization suite (`convex/projects.test.ts`) is the one that matters. It
asserts that user B cannot read, rename or delete user A's project, and that a
cross-tenant id is indistinguishable from a deleted one. It is a real test, not
a passing one: removing the ownership comparison in `convex/model/auth.ts`
makes exactly those cases fail.

`scripts/verify-auth-chain.mjs` goes further and exercises the same rules
against the live dev deployment with two real Clerk users and real JWTs:

```bash
npx dotenv -e .env.local -- node scripts/verify-auth-chain.mjs
```

It refuses to run unless the target is a `dev:` deployment with a Clerk test
key, and deletes everything it created.

End-to-end tests never start the app themselves:

```bash
pnpm dev                                                    # terminal 1
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e            # terminal 2
```

Smoke specs always run. The authenticated specs need a Clerk test account in
`E2E_CLERK_USER_EMAIL` / `E2E_CLERK_USER_PASSWORD`, and skip themselves with a
clear message otherwise.

## Claude Code

The repo is set up so an agent cannot guess at TanStack APIs:

- `.claude/settings.json` runs `.intent/hooks/intent-claude-gate.mjs` on
  `PreToolUse` and **denies** an edit until a TanStack skill has been loaded in
  the session. One `intent load …` opens the gate.
- `AGENTS.md` carries the generated skill mappings; `pnpm exec intent list`
  shows the 58 skills that ship with the installed packages.
- `.mcp.json` registers the Convex MCP server, pinned to the **dev**
  deployment.

> **If you use the official Convex Claude Code plugin, delete `.mcp.json`.**
> The plugin registers its own `convex` MCP server without the `--deployment
> dev` pin. Running both gives duplicated tools, one of them unrestricted.
> Check with `claude mcp list`: seeing both `convex` and
> `plugin:convex:convex` means you have the duplicate.

Convex's agent skills live in `.claude/skills/` and `.agents/`. They are
generated — refresh them with `npx convex ai-files install`.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the request paths, the
authorization model, the multi-tenancy and billing plans, and the table of
technologies deliberately left out.

The short version: Convex owns application data and authorizes every access
itself, because it verifies the Clerk JWT rather than trusting the app server.
Route guards are navigation, not security.

## Deployment

The build is host-agnostic through Nitro. Vercel is auto-detected — connect the
repo, set the environment variables, done — but nothing in the code is
Vercel-specific, and Cloudflare, Netlify, Railway or a plain Node host work
through the same adapter.

Convex is deployed separately with `npx convex deploy`, which is also what
issues your production `VITE_CONVEX_URL`. Point Clerk at a production instance
and set `CLERK_JWT_ISSUER_DOMAIN` on the production Convex deployment.

## Free tier assumptions

This starter is built to cost nothing until it has users. Quotas below were
read from the official pricing pages on **2026-08-10** — treat them as a
snapshot, not a contract, and re-check before relying on one.

| Service | Purpose | Free plan, verified 2026-08-10 | When you exceed it |
|---|---|---|---|
| **Convex** | Database, realtime, backend | Free/Starter: 1M function calls/mo, 0.5 GB storage, 1 GB/mo egress. No card. | Hard limit — requests error and the deployment pauses. No automatic charge. |
| **Clerk** | Auth | Hobby: 50,000 monthly active users, Organizations included (100 MAOs), 3 dashboard seats. No card at signup. | ⚠️ **Automatic billing** after a one-month grace period. No spend cap. See below. |
| **Vercel** | Hosting (optional) | Hobby: 100 GB transfer/mo, 1M function invocations/mo, 1M edge requests/mo. No card. | Hard limit — deployment pauses. No automatic charge. ⚠️ Hobby forbids commercial use. |
| **Resend** | Transactional email | Free: 3,000 emails/mo, 100/day, 1 verified domain. No card. | Behaviour past the cap **not confirmed** on the public page — verify before depending on it. |
| **PostHog** | Product analytics | Free: 1M events/mo, 5,000 session replays/mo, 1M feature-flag requests/mo. No card. | Ingestion stops. A **$0 spend cap is configurable per product** — set it. |
| **Sentry** | Error monitoring | Developer: 5,000 errors/mo, 50 replays/mo, 30-day retention, source maps included. No card. | Events are dropped silently. No automatic charge. |
| **GitHub Actions** | CI | Free: unlimited minutes on public repos, 2,000 min/mo on private, 500 MB artifacts. | ⚠️ On private repos with a payment method on file, extra minutes are **billed automatically**. Public repo = no risk. |
| **Stripe** | Payments (not installed) | No fixed cost; per-transaction only. Test mode needs no activated account. | — |

Two of these can charge you without asking:

- **Clerk** past 50,000 monthly active users. That is a good problem, but it
  arrives as an invoice rather than a wall. Watch the dashboard as you grow.
- **GitHub Actions** on a *private* repo once a payment method exists. Keep the
  repo public, or set a spending limit of $0 in the billing settings.

Everything else fails closed: you get errors or dropped data, never a bill.

Nothing in this starter requires a paid plan, and no feature here is gated
behind one. Sentry, PostHog, Resend and the AI providers are all optional —
with their keys unset the app runs normally and those integrations no-op.
