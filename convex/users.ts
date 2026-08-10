import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireIdentity } from "./model/auth";
import { upsertUser } from "./model/users";

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
 * Idempotent and safe on every app load. It is an optimisation, not a
 * prerequisite: authenticated mutations provision the row themselves through
 * `requireUser`, so nothing races on this landing first.
 */
export const ensureCurrent = mutation({
	args: {},
	returns: v.id("users"),
	handler: async (ctx) => {
		const identity = await requireIdentity(ctx);
		const user = await upsertUser(ctx, identity);
		return user._id;
	},
});
