/// <reference types="vite/client" />

import type {
	DataModelFromSchemaDefinition,
	UserIdentity,
} from "convex/server";
import {
	convexTest,
	type TestConvex,
	type TestConvexForDataModel,
} from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { PROJECT_LIST_LIMIT, PROJECT_NAME_MAX_LENGTH } from "./model/projects";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** A subset of Convex's `UserIdentity`, as Clerk would present it. */
type TestIdentity = Partial<UserIdentity>;

const ALICE: TestIdentity = {
	subject: "user_alice",
	issuer: "https://example.clerk.accounts.dev",
	tokenIdentifier: "https://example.clerk.accounts.dev|user_alice",
	email: "alice@example.com",
	name: "Alice",
};

const BOB: TestIdentity = {
	subject: "user_bob",
	issuer: "https://example.clerk.accounts.dev",
	tokenIdentifier: "https://example.clerk.accounts.dev|user_bob",
	email: "bob@example.com",
	name: "Bob",
};

/** An authenticated caller: the same surface, minus `withIdentity`. */
type Session = TestConvexForDataModel<
	DataModelFromSchemaDefinition<typeof schema>
>;

async function signedIn(
	t: TestConvex<typeof schema>,
	identity: TestIdentity,
): Promise<Session> {
	const session = t.withIdentity(identity);
	await session.mutation(api.users.ensureCurrent, {});
	return session;
}

describe("projects authorization", () => {
	test("a signed-out caller cannot create, and sees nothing", async () => {
		const t = convexTest(schema, modules);

		await expect(
			t.mutation(api.projects.create, { name: "x" }),
		).rejects.toThrow(/signed in/i);
		expect(await t.query(api.projects.list, {})).toEqual({
			projects: [],
			hasMore: false,
		});
	});

	test("a user only ever lists their own projects", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);
		const bob = await signedIn(t, BOB);

		await alice.mutation(api.projects.create, { name: "Alice project" });
		await bob.mutation(api.projects.create, { name: "Bob project" });

		expect(
			(await alice.query(api.projects.list, {})).projects.map((p) => p.name),
		).toEqual(["Alice project"]);
		expect(
			(await bob.query(api.projects.list, {})).projects.map((p) => p.name),
		).toEqual(["Bob project"]);
	});

	test("user B cannot rename user A's project", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);
		const bob = await signedIn(t, BOB);

		const projectId = await alice.mutation(api.projects.create, {
			name: "Alice project",
		});

		await expect(
			bob.mutation(api.projects.rename, { projectId, name: "Owned by Bob" }),
		).rejects.toThrow(/not found/i);

		const [project] = (await alice.query(api.projects.list, {})).projects;
		expect(project?.name).toBe("Alice project");
	});

	test("user B cannot delete user A's project", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);
		const bob = await signedIn(t, BOB);

		const projectId = await alice.mutation(api.projects.create, {
			name: "Alice project",
		});

		await expect(
			bob.mutation(api.projects.remove, { projectId }),
		).rejects.toThrow(/not found/i);

		expect((await alice.query(api.projects.list, {})).projects).toHaveLength(1);
	});

	test("a cross-tenant id is indistinguishable from a missing one", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);
		const bob = await signedIn(t, BOB);

		const aliceProjectId = await alice.mutation(api.projects.create, {
			name: "Alice project",
		});
		const bobProjectId = await bob.mutation(api.projects.create, {
			name: "Bob project",
		});
		await bob.mutation(api.projects.remove, { projectId: bobProjectId });

		// Someone else's live row and Bob's own deleted row must fail identically,
		// otherwise the API leaks which ids exist.
		const crossTenant = await bob
			.mutation(api.projects.rename, { projectId: aliceProjectId, name: "n" })
			.catch((error: Error) => error.message);
		const deleted = await bob
			.mutation(api.projects.rename, { projectId: bobProjectId, name: "n" })
			.catch((error: Error) => error.message);

		expect(crossTenant).toEqual(deleted);
	});

	test("the owner can rename and delete their own project", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);

		const projectId = await alice.mutation(api.projects.create, {
			name: "Before",
		});
		await alice.mutation(api.projects.rename, { projectId, name: "After" });

		const [renamed] = (await alice.query(api.projects.list, {})).projects;
		expect(renamed?.name).toBe("After");
		expect(renamed?.updatedAt).toBeGreaterThan(0);

		await alice.mutation(api.projects.remove, { projectId });
		expect((await alice.query(api.projects.list, {})).projects).toEqual([]);
	});
});

describe("project name validation", () => {
	test("rejects blank names and trims the rest", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);

		await expect(
			alice.mutation(api.projects.create, { name: "   " }),
		).rejects.toThrow(/required/i);

		await alice.mutation(api.projects.create, { name: "  Spaced   out  " });
		const [project] = (await alice.query(api.projects.list, {})).projects;
		expect(project?.name).toBe("Spaced out");
	});

	test("rejects names past the documented ceiling", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);

		await expect(
			alice.mutation(api.projects.create, {
				name: "a".repeat(PROJECT_NAME_MAX_LENGTH + 1),
			}),
		).rejects.toThrow(/characters or fewer/i);

		await alice.mutation(api.projects.create, {
			name: "a".repeat(PROJECT_NAME_MAX_LENGTH),
		});
		expect((await alice.query(api.projects.list, {})).projects).toHaveLength(1);
	});
});

describe("list truncation", () => {
	test("reports hasMore instead of silently cutting the page", async () => {
		const t = convexTest(schema, modules);
		const alice = await signedIn(t, ALICE);

		for (let i = 0; i < PROJECT_LIST_LIMIT; i++) {
			await alice.mutation(api.projects.create, { name: `Project ${i}` });
		}
		const full = await alice.query(api.projects.list, {});
		expect(full.projects).toHaveLength(PROJECT_LIST_LIMIT);
		expect(full.hasMore).toBe(false);

		await alice.mutation(api.projects.create, { name: "One too many" });
		const overflowing = await alice.query(api.projects.list, {});
		expect(overflowing.projects).toHaveLength(PROJECT_LIST_LIMIT);
		expect(overflowing.hasMore).toBe(true);
	});
});

describe("user provisioning", () => {
	test("a first write provisions the user, with no bootstrap call", async () => {
		const t = convexTest(schema, modules);
		// Deliberately no users.ensureCurrent: this is the sign-in race, where a
		// user clicks "create" before the bootstrap mutation has landed.
		const session = t.withIdentity(ALICE);

		const projectId = await session.mutation(api.projects.create, {
			name: "Created before bootstrap",
		});
		expect(typeof projectId).toBe("string");

		const user = await session.query(api.users.current, {});
		expect(user?.email).toBe(ALICE.email);

		// And the explicit bootstrap still returns that same row, not a duplicate.
		const bootstrapped = await session.mutation(api.users.ensureCurrent, {});
		expect(bootstrapped).toBe(user?._id);
	});

	test("ensureCurrent is idempotent and refreshes stale claims", async () => {
		const t = convexTest(schema, modules);

		const first = await t
			.withIdentity(ALICE)
			.mutation(api.users.ensureCurrent, {});
		const second = await t
			.withIdentity(ALICE)
			.mutation(api.users.ensureCurrent, {});
		expect(second).toBe(first);

		const renamed = await t
			.withIdentity({ ...ALICE, name: "Alice Renamed" })
			.mutation(api.users.ensureCurrent, {});
		expect(renamed).toBe(first);

		const user = await t.withIdentity(ALICE).query(api.users.current, {});
		expect(user?.name).toBe("Alice Renamed");
	});

	test("a signed-out caller has no current user", async () => {
		const t = convexTest(schema, modules);
		expect(await t.query(api.users.current, {})).toBeNull();
	});
});
