/**
 * shopifyAuth.js  (platforms/shopify)
 *
 * Utilities for validating Shopify session tokens (JWT) issued by App Bridge.
 * These are separate from PackageGuard's own JWTs — they are signed by Shopify
 * using the app's API secret as the HMAC-SHA256 key.
 *
 * Spec: https://shopify.dev/docs/apps/auth/session-tokens
 *
 * Env vars:
 *   SHOPIFY_API_SECRET  – Shopify app API secret (used to verify session tokens)
 *   SHOPIFY_API_KEY     – Shopify app API key (client ID, used to verify aud claim)
 */

const crypto = require('crypto');

/**
 * Decode and verify a Shopify App Bridge session token (HS256 JWT).
 * Returns the payload if valid, throws on failure.
 *
 * @param {string} token  Raw JWT from the Authorization header
 * @returns {{ dest: string, sub: string, iss: string, aud: string, exp: number }}
 */
function verifySessionToken (token) {
  if (!token) throw new Error('Missing Shopify session token');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Shopify session token');

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify HS256 signature using SHOPIFY_API_SECRET
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error('SHOPIFY_API_SECRET not configured');

  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))) {
    throw new Error('Invalid Shopify session token signature');
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  // Validate expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Shopify session token expired');
  }

  // Validate audience matches our app
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (apiKey && payload.aud !== apiKey) {
    throw new Error('Shopify session token audience mismatch');
  }

  return payload;
}

/**
 * Extract the shop domain from a Shopify session token payload.
 * The "dest" claim is "https://{shop-domain}".
 *
 * @param {{ dest: string }} payload
 * @returns {string}  e.g. "my-store.myshopify.com"
 */
function shopDomainFromPayload (payload) {
  if (!payload.dest) throw new Error('Missing dest claim in session token');
  return new URL(payload.dest).hostname;
}

module.exports = { verifySessionToken, shopDomainFromPayload };
