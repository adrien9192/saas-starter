import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	/**
	 * Local mirror of the authenticated identity.
	 *
	 * Keyed by `tokenIdentifier` (issuer + subject), the canonical stable id for
	 * an identity. Rows are provisioned by `users.ensureCurrent`; nothing here is
	 * ever written from client-supplied values other than through that mutation.
	 */
	users: defineTable({
		tokenIdentifier: v.string(),
		email: v.optional(v.string()),
		name: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
	}).index("by_token_identifier", { fields: ["tokenIdentifier"] }),

	/**
	 * `_creationTime` is the createdAt — no need to duplicate it.
	 * `updatedAt` is explicit because it is a domain value, not a system value.
	 */
	projects: defineTable({
		ownerId: v.id("users"),
		name: v.string(),
		updatedAt: v.number(),
	}).index("by_owner", { fields: ["ownerId"] }),
});
