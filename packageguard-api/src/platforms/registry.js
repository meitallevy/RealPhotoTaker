/**
 * registry.js  (platforms)
 *
 * Central platform adapter registry.
 *
 * The auth abstraction middleware calls getAdapters() and tries each adapter
 * in registration order until one succeeds.  Register adapters from most
 * specific to least specific — i.e. Shopify before JWT so a request that has
 * both an X-Shopify-Shop-Domain header AND a Bearer token is handled by Shopify.
 *
 * Adding a new platform:
 *   1. Create platforms/{platform}/{platform}Adapter.js
 *   2. registerAdapter(require('./{platform}/{platform}Adapter'))
 */

const adapters = [];

/**
 * Register a platform adapter instance.
 * @param {import('./base/PlatformAdapter')} adapter
 */
function registerAdapter (adapter) {
  adapters.push(adapter);
}

/**
 * Return all registered adapters in priority order.
 * @returns {import('./base/PlatformAdapter')[]}
 */
function getAdapters () {
  return adapters;
}

/**
 * Return the adapter registered for a specific platform type, or null.
 * @param {string} platformType
 * @returns {import('./base/PlatformAdapter')|null}
 */
function getAdapter (platformType) {
  return adapters.find(a => a.getPlatformType() === platformType) || null;
}

// ── Register adapters (most-specific first) ────────────────────────────────
registerAdapter(require('./shopify/shopifyAdapter'));
registerAdapter(require('./jwt/jwtAdapter'));
// Future: registerAdapter(require('./wix/wixAdapter'));

module.exports = { registerAdapter, getAdapters, getAdapter };
