import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { env } from "../_generated/server";

/**
 * Provider-neutral model resolution for AI features.
 *
 * AI calls belong in Convex actions: they need secrets, they are slow, and they
 * often want scheduling or retries — all of which the backend already has.
 * Keys live in the Convex deployment environment, never in the client bundle.
 *
 * Nothing here runs unless a feature calls `resolveModel`, so the app builds
 * and runs with no AI keys configured at all.
 *
 * Adding a provider is one entry in `PROVIDERS`.
 */
export type ProviderId = "anthropic" | "openai" | "google" | "openrouter";

interface ProviderConfig {
	envName: string;
	apiKey: () => string | undefined;
	create: (apiKey: string) => (modelId: string) => LanguageModel;
}

const PROVIDERS: Record<ProviderId, ProviderConfig> = {
	anthropic: {
		envName: "ANTHROPIC_API_KEY",
		apiKey: () => env.ANTHROPIC_API_KEY,
		create: (apiKey) => createAnthropic({ apiKey }),
	},
	openai: {
		envName: "OPENAI_API_KEY",
		apiKey: () => env.OPENAI_API_KEY,
		create: (apiKey) => createOpenAI({ apiKey }),
	},
	google: {
		envName: "GOOGLE_GENERATIVE_AI_API_KEY",
		apiKey: () => env.GOOGLE_GENERATIVE_AI_API_KEY,
		create: (apiKey) => createGoogleGenerativeAI({ apiKey }),
	},
	openrouter: {
		envName: "OPENROUTER_API_KEY",
		apiKey: () => env.OPENROUTER_API_KEY,
		create: (apiKey) => createOpenRouter({ apiKey }).chat,
	},
};

/** `"anthropic:claude-sonnet-4-5"` → a configured AI SDK model. */
export function resolveModel(reference: string): LanguageModel {
	const separator = reference.indexOf(":");
	if (separator === -1) {
		throw new Error(
			`Model reference must be "<provider>:<model>", got "${reference}".`,
		);
	}

	const providerId = reference.slice(0, separator) as ProviderId;
	const modelId = reference.slice(separator + 1);
	const provider = PROVIDERS[providerId];
	if (provider === undefined) {
		throw new Error(
			`Unknown provider "${providerId}". Known: ${Object.keys(PROVIDERS).join(", ")}.`,
		);
	}

	const apiKey = provider.apiKey();
	if (!apiKey) {
		throw new Error(
			`${provider.envName} is not set on this Convex deployment. Run: pnpm convex env set ${provider.envName}=…`,
		);
	}

	return provider.create(apiKey)(modelId);
}
