/**
 * One-shot wiring of Clerk <-> Convex for a fresh clone.
 *
 * Does the three fiddly steps by hand-free API calls:
 *   1. derives the Clerk issuer domain from the publishable key;
 *   2. creates (or repairs) the `convex` JWT template with the claims Convex
 *      needs — the default template only sets `aud`, which authenticates fine
 *      and silently leaves every user without a name or email;
 *   3. sets CLERK_JWT_ISSUER_DOMAIN on the Convex dev deployment.
 *
 * Idempotent, and additive: an existing template keeps every claim it already
 * has, so sharing one Clerk application across several projects is safe.
 * Touches dev only, and refuses live keys.
 *
 *   pnpm bootstrap
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The claims Convex needs. Anything else already on the template is kept. */
const CLAIMS = {
	aud: "convex",
	email: "{{user.primary_email_address}}",
	name: "{{user.full_name}}",
	picture: "{{user.image_url}}",
};

function fail(message) {
	console.error(`\n✗ ${message}\n`);
	process.exit(1);
}

const secret = process.env.CLERK_SECRET_KEY;
const publishable = process.env.VITE_CLERK_PUBLISHABLE_KEY;
const deployment = process.env.CONVEX_DEPLOYMENT;

if (!secret || !publishable) {
	fail(
		"CLERK_SECRET_KEY and VITE_CLERK_PUBLISHABLE_KEY are missing.\n" +
			"  Create an application at https://dashboard.clerk.com, then put both keys in .env.local.",
	);
}
if (secret.startsWith("sk_live_") || publishable.startsWith("pk_live_")) {
	fail("These are live Clerk keys. This script only wires development instances.");
}
if (!deployment) {
	fail(
		"CONVEX_DEPLOYMENT is empty — no Convex project yet.\n" +
			"  Run `pnpm convex` once (it asks for a region, then writes .env.local), then re-run `pnpm bootstrap`.",
	);
}
if (!deployment.startsWith("dev:")) {
	fail(`CONVEX_DEPLOYMENT is "${deployment}". This script only targets dev deployments.`);
}

// 1. Issuer domain. The publishable key is base64 of "<host>$".
const issuer = `https://${Buffer.from(publishable.replace(/^pk_(test|live)_/, ""), "base64")
	.toString("utf8")
	.replace(/\$$/, "")}`;
console.log(`Clerk issuer : ${issuer}`);
console.log(`Convex       : ${deployment}\n`);

// 2. JWT template.
const clerkHeaders = {
	Authorization: `Bearer ${secret}`,
	"Content-Type": "application/json",
};

async function clerk(path, init = {}) {
	const res = await fetch(`https://api.clerk.com/v1${path}`, {
		...init,
		headers: clerkHeaders,
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		fail(`Clerk API ${path} -> ${res.status}\n  ${JSON.stringify(body).slice(0, 400)}`);
	}
	return body;
}

const listed = await clerk("/jwt_templates");
const templates = Array.isArray(listed) ? listed : (listed.data ?? []);
const existing = templates.find((t) => t.name === "convex");

// Key order is not meaningful, and Clerk does not preserve ours.
const canonical = (claims) => JSON.stringify(Object.entries(claims ?? {}).sort());

if (existing === undefined) {
	await clerk("/jwt_templates", {
		method: "POST",
		body: JSON.stringify({
			name: "convex",
			claims: CLAIMS,
			lifetime: 3600,
			allowed_clock_skew: 5,
			signing_algorithm: "RS256",
		}),
	});
	console.log("✓ Clerk JWT template `convex` created");
} else {
	// Additive: keep whatever else the template already carries. Another
	// project may share this Clerk application and rely on its own claims.
	const merged = { ...(existing.claims ?? {}), ...CLAIMS };
	if (canonical(existing.claims) === canonical(merged)) {
		console.log("✓ Clerk JWT template `convex` already carries the Convex claims");
	} else {
		const added = Object.keys(CLAIMS).filter(
			(key) => (existing.claims ?? {})[key] !== CLAIMS[key],
		);
		await clerk(`/jwt_templates/${existing.id}`, {
			method: "PATCH",
			body: JSON.stringify({
				name: "convex",
				claims: merged,
				lifetime: 3600,
				allowed_clock_skew: 5,
			}),
		});
		console.log(
			`✓ Clerk JWT template \`convex\` updated (${added.join(", ")}); existing claims kept`,
		);
	}
}

// 3. Convex deployment env.
// The repo-local Convex CLI, so this can never resolve to a different version.
await run("node_modules/.bin/convex", [
	"env",
	"set",
	`CLERK_JWT_ISSUER_DOMAIN=${issuer}`,
]).catch((error) => fail(`convex env set failed:\n  ${error.stderr || error.message}`));
console.log(`✓ CLERK_JWT_ISSUER_DOMAIN set on ${deployment}`);

console.log(
	"\nDone. Verify the whole chain end to end with:\n" +
		"  npx dotenv -e .env.local -- node scripts/verify-auth-chain.mjs\n",
);
