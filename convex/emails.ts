"use node";

import { v } from "convex/values";
import { render } from "react-email";
import { Resend } from "resend";
import WelcomeEmail from "../emails/welcome-email";
import { env, internalAction } from "./_generated/server";

/**
 * Transactional email.
 *
 * The provider boundary is deliberately thin: one `send` function, one place
 * that knows the word "Resend". Swapping providers means rewriting `send`, not
 * touching any caller.
 *
 * With no `RESEND_API_KEY` on the deployment this logs and reports
 * `sent: false` instead of throwing, so a fresh clone runs end to end without
 * an email account and CI never sends anything.
 */
interface SendResult {
	sent: boolean;
	reason?: string;
}

async function send(message: {
	to: string;
	subject: string;
	html: string;
}): Promise<SendResult> {
	const apiKey = env.RESEND_API_KEY;
	const from = env.EMAIL_FROM;

	if (!apiKey || !from) {
		console.warn(
			`Email not sent to ${message.to}: set RESEND_API_KEY and EMAIL_FROM on this deployment.`,
		);
		return { sent: false, reason: "not_configured" };
	}

	const { error } = await new Resend(apiKey).emails.send({
		from,
		to: message.to,
		subject: message.subject,
		html: message.html,
	});

	if (error) {
		throw new Error(`Resend rejected the message: ${error.message}`);
	}
	return { sent: true };
}

/**
 * Internal on purpose: nothing reachable from a browser should be able to make
 * this app send mail to an arbitrary address. Schedule it from a mutation, e.g.
 * `ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, { … })`.
 */
export const sendWelcomeEmail = internalAction({
	args: { to: v.string(), name: v.string() },
	returns: v.object({ sent: v.boolean(), reason: v.optional(v.string()) }),
	handler: async (_ctx, args) => {
		const appUrl = env.APP_URL ?? "http://localhost:3000";
		const html = await render(
			WelcomeEmail({ name: args.name, dashboardUrl: `${appUrl}/dashboard` }),
		);
		return await send({
			to: args.to,
			subject: "Your workspace is ready",
			html,
		});
	},
});
