import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Authorization helpers. Every public Convex function that touches user data
 * goes through these.
 *
 * Rules enforced here, and nowhere else:
 *  - identity comes from `ctx.auth`, never from a function argument;
 *  - a row is only reachable by the user whose `_id` is in its `ownerId`;
 *  - a row owned by somebody else is reported as NOT_FOUND, not FORBIDDEN, so
 *    the API cannot be used to enumerate other tenants' ids.
 */

export type AppErrorCode = "UNAUTHENTICATED" | "NOT_FOUND" | "INVALID_ARGUMENT";

export function appError(
	code: AppErrorCode,
	message: string,
): ConvexError<{
	code: AppErrorCode;
	message: string;
}> {
	return new ConvexError({ code, message });
}

/** The raw JWT identity. Throws when the caller is not signed in. */
export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) {
		throw appError("UNAUTHENTICATED", "You must be signed in.");
	}
	return identity;
}

/** The `users` row for the caller, or `null` when signed out / not provisioned. */
export async function getCurrentUser(
	ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) return null;
	return await ctx.db
		.query("users")
		.withIndex("by_token_identifier", (q) =>
			q.eq("tokenIdentifier", identity.tokenIdentifier),
		)
		.unique();
}

/** The `users` row for the caller. Throws when signed out. */
export async function requireUser(
	ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
	const identity = await requireIdentity(ctx);
	const user = await ctx.db
		.query("users")
		.withIndex("by_token_identifier", (q) =>
			q.eq("tokenIdentifier", identity.tokenIdentifier),
		)
		.unique();
	if (user === null) {
		throw appError(
			"UNAUTHENTICATED",
			"Your profile has not been provisioned yet.",
		);
	}
	return user;
}

/**
 * Narrows a document to one the caller owns.
 *
 * Missing and not-yours collapse to the same NOT_FOUND on purpose: a caller
 * must not be able to tell an id that does not exist from an id that belongs
 * to another account.
 */
export function requireOwner<T extends { ownerId: Id<"users"> }>(
	user: Doc<"users">,
	doc: T | null,
): T {
	if (doc === null || doc.ownerId !== user._id) {
		throw appError("NOT_FOUND", "Not found.");
	}
	return doc;
}
