import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
	appError,
	getCurrentUser,
	requireOwner,
	requireUser,
} from "./model/auth";
import {
	normalizeProjectName,
	PROJECT_LIST_LIMIT,
	projectNameErrorMessage,
	validateProjectName,
} from "./model/projects";

const projectObject = v.object({
	_id: v.id("projects"),
	_creationTime: v.number(),
	ownerId: v.id("users"),
	name: v.string(),
	updatedAt: v.number(),
});

function assertValidName(raw: string): string {
	const error = validateProjectName(raw);
	if (error !== null) {
		throw appError("INVALID_ARGUMENT", projectNameErrorMessage(error));
	}
	return normalizeProjectName(raw);
}

/**
 * The caller's projects, newest first, with an explicit truncation flag.
 *
 * Returns an empty page rather than throwing when signed out: this query runs
 * during the sign-out transition, and "no identity, no rows" is the honest
 * answer. It cannot leak anything — the owner filter is an index range on the
 * caller's own `_id`.
 */
export const list = query({
	args: {},
	returns: v.object({
		projects: v.array(projectObject),
		hasMore: v.boolean(),
	}),
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (user === null) return { projects: [], hasMore: false };

		// One extra row is the cheapest way to know whether the page is complete.
		const rows = await ctx.db
			.query("projects")
			.withIndex("by_owner", (q) => q.eq("ownerId", user._id))
			.order("desc")
			.take(PROJECT_LIST_LIMIT + 1);

		return {
			projects: rows.slice(0, PROJECT_LIST_LIMIT),
			hasMore: rows.length > PROJECT_LIST_LIMIT,
		};
	},
});

export const create = mutation({
	args: { name: v.string() },
	returns: v.id("projects"),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const name = assertValidName(args.name);
		return await ctx.db.insert("projects", {
			ownerId: user._id,
			name,
			updatedAt: Date.now(),
		});
	},
});

export const rename = mutation({
	args: { projectId: v.id("projects"), name: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const project = requireOwner(
			user,
			await ctx.db.get("projects", args.projectId),
		);
		const name = assertValidName(args.name);
		await ctx.db.patch("projects", project._id, {
			name,
			updatedAt: Date.now(),
		});
		return null;
	},
});

export const remove = mutation({
	args: { projectId: v.id("projects") },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const project = requireOwner(
			user,
			await ctx.db.get("projects", args.projectId),
		);
		await ctx.db.delete("projects", project._id);
		return null;
	},
});
