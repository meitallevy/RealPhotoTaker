/**
 * shopifySessionService.js  (platforms/shopify)
 *
 * Lightweight in-process session store that maps a Shopify shop domain
 * to the seller record created after OAuth.  In a multi-instance
 * deployment (e.g. several Render dynos) this should be replaced with
 * a Redis-backed store; for a single-instance server it works fine.
 *
 * Sessions are keyed by shop domain and hold the internal sellerId so
 * the Shopify adapter can build req.user without a DB call on every
 * request.
 */

// { shopDomain → { sellerId, sub, installedAt } }
const sessions = new Map();

/**
 * Persist a session after a successful OAuth callback.
 *
 * @param {string} shopDomain  e.g. "my-store.myshopify.com"
 * @param {{ sellerId: string, sub: string }} data
 */
function setSession (shopDomain, data) {
  sessions.set(shopDomain.toLowerCase(), {
    sellerId: data.sellerId,
    sub: data.sub,
    installedAt: new Date().toISOString()
  });
}

/**
 * Retrieve a session by shop domain.
 *
 * @param {string} shopDomain
 * @returns {{ sellerId: string, sub: string, installedAt: string } | undefined}
 */
function getSession (shopDomain) {
  return sessions.get(shopDomain.toLowerCase());
}

/**
 * Remove a session (called on app/uninstalled webhook).
 *
 * @param {string} shopDomain
 */
function deleteSession (shopDomain) {
  sessions.delete(shopDomain.toLowerCase());
}

module.exports = { setSession, getSession, deleteSession };
