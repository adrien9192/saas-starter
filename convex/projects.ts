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
	projectNameErrorMessage,
	validateProjectName,
} from "./model/projects";

/** Ceiling on a single page of projects. Past this the UI must paginate. */
const LIST_LIMIT = 200;

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
 * The caller's projects, newest first.
 *
 * Returns `[]` rather than throwing when signed out: this query runs during the
 * sign-out transition, and an empty list is the honest answer for "no identity".
 * It cannot leak anything — the owner filter is an index range on the caller's
 * own `_id`.
 */
export const list = query({
	args: {},
	returns: v.array(projectObject),
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (user === null) return [];
		return await ctx.db
			.query("projects")
			.withIndex("by_owner", (q) => q.eq("ownerId", user._id))
			.order("desc")
			.take(LIST_LIMIT);
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
