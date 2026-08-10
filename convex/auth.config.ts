/**
 * Convex trusts JWTs issued by this provider.
 *
 * `domain` is the Clerk issuer URL. Convex fetches
 * `{domain}/.well-known/openid-configuration` to discover the JWKS endpoint.
 * `applicationID` is matched against the JWT `aud` claim, which the Clerk
 * "convex" JWT template sets.
 *
 * Set on the deployment with:
 *   pnpm convex env set CLERK_JWT_ISSUER_DOMAIN=https://<your-app>.clerk.accounts.dev
 *
 * Without this file `ctx.auth.getUserIdentity()` silently returns null forever.
 */
export default {
	providers: [
		{
			domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
			applicationID: "convex",
		},
	],
};
