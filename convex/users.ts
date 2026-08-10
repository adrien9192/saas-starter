import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireIdentity } from "./model/auth";

const userFields = {
	_id: v.id("users"),
	_creationTime: v.number(),
	tokenIdentifier: v.string(),
	email: v.optional(v.string()),
	name: v.optional(v.string()),
	imageUrl: v.optional(v.string()),
};

/** The signed-in user's row, or `null` when signed out. */
export const current = query({
	args: {},
	returns: v.union(v.object(userFields), v.null()),
	handler: async (ctx) => await getCurrentUser(ctx),
});

/**
 * Creates or refreshes the caller's row from their JWT claims.
 *
 * Idempotent, and safe to call on every app load. Every field written here
 * comes from the verified identity — never from a client argument.
 */
export const ensureCurrent = mutation({
	args: {},
	returns: v.id("users"),
	handler: async (ctx) => {
		const identity = await requireIdentity(ctx);
		const profile = {
			email: identity.email,
			name: identity.name ?? identity.nickname ?? identity.preferredUsername,
			imageUrl: identity.pictureUrl,
		};

		const existing = await ctx.db
			.query("users")
			.withIndex("by_token_identifier", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();

		if (existing !== null) {
			const isStale =
				existing.email !== profile.email ||
				existing.name !== profile.name ||
				existing.imageUrl !== profile.imageUrl;
			if (isStale) await ctx.db.patch("users", existing._id, profile);
			return existing._id;
		}

		return await ctx.db.insert("users", {
			tokenIdentifier: identity.tokenIdentifier,
			...profile,
		});
	},
});
