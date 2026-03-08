/**
 * shopifyRoutes.js
 *
 * Shopify OAuth installation flow and embedded-app entry point.
 * Mounted at /auth/shopify in app.js.
 *
 * GET  /auth/shopify           – Begin OAuth (redirect merchant to Shopify consent)
 * GET  /auth/shopify/callback  – OAuth callback (exchange code, create/update seller)
 *
 * After a successful install the merchant is redirected to their Shopify Admin
 * embedded app page which loads the React frontend.
 *
 * Env vars: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const {
  buildAuthUrl,
  verifyHmac,
  exchangeToken,
  upsertSeller
} = require('../platforms/shopify/shopifyOAuthService');

// ── In-memory CSRF nonce store ─────────────────────────────────────────────
// For multi-instance deployments replace with a Redis-backed store.
const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Purge expired entries to prevent unbounded memory growth.
// Runs whenever a new state is created (lazy cleanup, ~O(n) but Map is small).
function purgeExpiredStates () {
  const now = Date.now();
  for (const [key, entry] of pendingStates) {
    if (now > entry.expiresAt) pendingStates.delete(key);
  }
}

function createState (shop) {
  purgeExpiredStates();
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { shop, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

function consumeState (state) {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

/**
 * GET /auth/shopify
 * Begin OAuth installation.  Shopify redirects here when a merchant
 * clicks "Install" or when the embedded app needs re-auth.
 *
 * Query params:
 *   shop   – The merchant's myshopify.com domain (required)
 */
router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop || !shop.match(/^[a-zA-Z0-9-]+\.myshopify\.com$/)) {
    return res.status(400).json({ error: { message: 'Missing or invalid shop parameter' } });
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!apiKey || !appUrl) {
    // eslint-disable-next-line no-console
    console.error('[shopifyRoutes] SHOPIFY_API_KEY or SHOPIFY_APP_URL not configured');
    return res.status(500).json({ error: { message: 'Shopify integration not configured' } });
  }

  const state = createState(shop);
  const authUrl = buildAuthUrl(shop, state);
  return res.redirect(authUrl);
});

/**
 * GET /auth/shopify/callback
 * Shopify redirects here after the merchant approves the OAuth permissions.
 *
 * Query params:
 *   code   – Authorization code
 *   shop   – Merchant shop domain
 *   state  – CSRF nonce we generated
 *   hmac   – HMAC signature from Shopify
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, shop, state } = req.query;

    if (!code || !shop || !state) {
      return res.status(400).json({ error: { message: 'Missing OAuth parameters' } });
    }

    // Verify Shopify HMAC signature
    if (!verifyHmac(req.query)) {
      return res.status(401).json({ error: { message: 'Invalid HMAC signature' } });
    }

    // Verify and consume CSRF state
    const stateEntry = consumeState(state);
    if (!stateEntry || stateEntry.shop !== shop) {
      return res.status(403).json({ error: { message: 'Invalid or expired state' } });
    }

    // Exchange authorization code for permanent access token
    const accessToken = await exchangeToken(shop, code);

    // Create or update seller in DB (also seeds in-memory session)
    await upsertSeller(shop, accessToken);

    // Redirect merchant to Shopify Admin embedded app.
    // SHOPIFY_API_KEY is validated above on the initiation route,
    // but guard here too in case the env changed between requests.
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { message: 'Shopify integration not configured' } });
    }
    const redirectUrl = `https://${shop}/admin/apps/${apiKey}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
