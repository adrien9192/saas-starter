import type { UserIdentity } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * User provisioning, in one place.
 *
 * Both the explicit `users.ensureCurrent` mutation and every authenticated
 * write go through `upsertUser`, so a row always exists by the time a mutation
 * needs one. There is no window in which a signed-in caller has no profile.
 */

interface UserProfile {
	email?: string;
	name?: string;
	imageUrl?: string;
}

/** Everything we mirror from the JWT. Nothing here comes from the client. */
function profileFromIdentity(identity: UserIdentity): UserProfile {
	return {
		email: identity.email,
		name: identity.name ?? identity.nickname ?? identity.preferredUsername,
		imageUrl: identity.pictureUrl,
	};
}

export async function findUserByToken(
	ctx: QueryCtx | MutationCtx,
	tokenIdentifier: string,
): Promise<Doc<"users"> | null> {
	return await ctx.db
		.query("users")
		.withIndex("by_token_identifier", (q) =>
			q.eq("tokenIdentifier", tokenIdentifier),
		)
		.unique();
}

/**
 * Creates the caller's row, or refreshes it when the JWT claims changed.
 * Idempotent, and cheap: the common path is one indexed read and no write.
 */
export async function upsertUser(
	ctx: MutationCtx,
	identity: UserIdentity,
): Promise<Doc<"users">> {
	const profile = profileFromIdentity(identity);
	const existing = await findUserByToken(ctx, identity.tokenIdentifier);

	if (existing !== null) {
		const isStale =
			existing.email !== profile.email ||
			existing.name !== profile.name ||
			existing.imageUrl !== profile.imageUrl;
		if (!isStale) return existing;
		await ctx.db.patch("users", existing._id, profile);
		return { ...existing, ...profile };
	}

	const userId = await ctx.db.insert("users", {
		tokenIdentifier: identity.tokenIdentifier,
		...profile,
	});
	const created = await ctx.db.get("users", userId);
	if (created === null) {
		throw new Error("Just-inserted user row could not be read back.");
	}
	return created;
}
