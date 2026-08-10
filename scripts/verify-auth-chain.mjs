/**
 * Proves the real Clerk -> Convex identity chain against the dev deployment:
 * JWT template `convex`, auth.config.ts issuer, ctx.auth.getUserIdentity(),
 * and cross-tenant isolation with two genuinely different Clerk users.
 *
 * Writes data, so it refuses to run against anything but a dev deployment and
 * a Clerk test key, and removes everything it created in a finally block.
 */
import { ConvexHttpClient } from "convex/browser";

const CLERK_SECRET = process.env.CLERK_SECRET_KEY;
const CONVEX_URL = process.env.VITE_CONVEX_URL;
const CONVEX_DEPLOYMENT = process.env.CONVEX_DEPLOYMENT ?? "";
const API = "https://api.clerk.com/v1";

if (!CONVEX_DEPLOYMENT.startsWith("dev:")) {
  throw new Error(`Refusing to run: CONVEX_DEPLOYMENT="${CONVEX_DEPLOYMENT}", expected dev:`);
}
if (!CONVEX_URL) throw new Error("Refusing to run: VITE_CONVEX_URL is empty.");
if (!CLERK_SECRET?.startsWith("sk_test_")) {
  throw new Error("Refusing to run: CLERK_SECRET_KEY is not a test key.");
}
console.log(`Target: ${CONVEX_DEPLOYMENT}\n`);

const headers = { Authorization: `Bearer ${CLERK_SECRET}`, "Content-Type": "application/json" };

async function clerk(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/** Users this run created, and must therefore delete. Pre-existing ones are left alone. */
const createdUserIds = [];

async function makeUser(local) {
  const email = `${local}+clerk_test@example.com`;
  const existing = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (Array.isArray(existing) && existing.length > 0) return existing[0];
  const user = await clerk("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password: `Vf7!${local}-2026-xQ`,
      skip_password_checks: true,
    }),
  });
  createdUserIds.push(user.id);
  return user;
}

async function convexTokenFor(userId) {
  const session = await clerk("/sessions", { method: "POST", body: JSON.stringify({ user_id: userId }) });
  const token = await clerk(`/sessions/${session.id}/tokens/convex`, {
    method: "POST",
    body: JSON.stringify({ expires_in_seconds: 300 }),
  });
  return token.jwt;
}

function clientFor(jwt) {
  const c = new ConvexHttpClient(CONVEX_URL);
  c.setAuth(jwt);
  return c;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

let aliceClient;
let createdProjectId;

try {
  const alice = await makeUser("alice-e2e");
  const bob = await makeUser("bob-e2e");
  aliceClient = clientFor(await convexTokenFor(alice.id));
  const bobClient = clientFor(await convexTokenFor(bob.id));

  // 1. Identity actually crosses the wire.
  check(
    "anonymous caller has no identity",
    (await new ConvexHttpClient(CONVEX_URL).query("users:current", {})) === null,
  );

  const aliceUserId = await aliceClient.mutation("users:ensureCurrent", {});
  check("Clerk JWT yields a Convex identity", typeof aliceUserId === "string", aliceUserId);

  const profile = await aliceClient.query("users:current", {});
  check(
    "identity claims reach the backend",
    profile?.email === "alice-e2e+clerk_test@example.com",
    profile?.email,
  );

  await bobClient.mutation("users:ensureCurrent", {});

  // 2. Owner CRUD.
  createdProjectId = await aliceClient.mutation("projects:create", { name: "  Live   check  " });
  check(
    "create + whitespace normalisation",
    (await aliceClient.query("projects:list", {})).some((p) => p.name === "Live check"),
  );

  await aliceClient.mutation("projects:rename", { projectId: createdProjectId, name: "Renamed" });
  check(
    "owner can rename",
    (await aliceClient.query("projects:list", {})).some((p) => p.name === "Renamed"),
  );

  // 3. Cross-tenant isolation, on the real deployment.
  const bobList = await bobClient.query("projects:list", {});
  check(
    "bob does not see alice's project",
    !bobList.some((p) => p._id === createdProjectId),
    `bob sees ${bobList.length}`,
  );

  let renameBlocked = false;
  try {
    await bobClient.mutation("projects:rename", { projectId: createdProjectId, name: "stolen" });
  } catch (error) {
    renameBlocked = /not found/i.test(String(error));
  }
  check("bob cannot rename alice's project", renameBlocked);

  let deleteBlocked = false;
  try {
    await bobClient.mutation("projects:remove", { projectId: createdProjectId });
  } catch (error) {
    deleteBlocked = /not found/i.test(String(error));
  }
  check("bob cannot delete alice's project", deleteBlocked);

  check(
    "alice's project survived both attempts",
    (await aliceClient.query("projects:list", {})).some((p) => p._id === createdProjectId),
  );

  // 4. Validation is server-side, not just in the form.
  let blankRejected = false;
  try {
    await aliceClient.mutation("projects:create", { name: "   " });
  } catch (error) {
    blankRejected = /required/i.test(String(error));
  }
  check("blank name rejected by the backend", blankRejected);
} finally {
  console.log("\n--- cleanup ---");
  if (aliceClient && createdProjectId) {
    await aliceClient.mutation("projects:remove", { projectId: createdProjectId }).then(
      () => console.log("removed test project"),
      (e) => console.log(`project cleanup failed: ${e}`),
    );
  }
  for (const id of createdUserIds) {
    await clerk(`/users/${id}`, { method: "DELETE" }).then(
      () => console.log(`deleted Clerk user ${id}`),
      (e) => console.log(`user cleanup failed for ${id}: ${e}`),
    );
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
