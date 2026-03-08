/**
 * authAbstraction.js  (middleware)
 *
 * Unified authentication middleware that supports all registered platform adapters.
 * Replaces direct usage of the JWT-only middleware/auth.js on seller routes.
 *
 * How it works:
 *   1. Iterate over all platform adapters in registration order (registry.js)
 *   2. For each adapter, call canAuthenticate(req) — a cheap synchronous check
 *   3. If the adapter claims the request, call authenticate(req)
 *   4. On success, set req.user and call next()
 *   5. If no adapter succeeds, return 401
 *
 * req.user shape (same for all platforms):
 *   { sellerId, sub, role, platformType, ...platformExtras }
 *
 * Existing Android / JWT sellers are handled transparently by jwtAdapter.
 * Shopify embedded app sellers are handled by shopifyAdapter.
 * Adding a new platform requires zero changes here.
 */

const platformRegistry = require('../platforms/registry');

async function authenticate (req, res, next) {
  const adapters = platformRegistry.getAdapters();

  for (const adapter of adapters) {
    if (!adapter.canAuthenticate(req)) continue;

    try {
      req.user = await adapter.authenticate(req);
      return next();
    } catch (err) {
      // This adapter failed — try the next one.
      // Log at debug level; don't surface error details to the caller.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug(`[authAbstraction] ${adapter.getPlatformType()} adapter rejected: ${err.message}`);
      }
    }
  }

  // No adapter could authenticate this request
  // Preserve the web-route HTML error page behaviour from the original auth.js
  if (req.path && req.path.includes('/web/')) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html><head><title>Unauthorized</title></head>
      <body><h1>401 Unauthorized</h1><p>Missing or invalid authentication token.</p>
      <p><a href="/v1/auth/login">Login</a></p></body></html>
    `);
  }

  return res.status(401).json({ error: { message: 'Authentication required' } });
}

module.exports = { authenticate };
