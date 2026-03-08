/**
 * shopifyOAuthService.js  (platforms/shopify)
 *
 * Handles the Shopify OAuth 2.0 installation flow:
 *   1. buildAuthUrl()    – build the Shopify permission URL to redirect the merchant to
 *   2. exchangeToken()   – exchange the code from the callback for an access token
 *   3. upsertSeller()    – look up or create a seller record in the DB
 *
 * Shopify sellers get a synthetic `users` row so sellerController's JOIN on
 * sellers.user_id keeps working without any controller changes.
 *
 * Env vars:
 *   SHOPIFY_API_KEY       – Shopify app API key (client ID)
 *   SHOPIFY_API_SECRET    – Shopify app API secret (used for HMAC verification + token exchange)
 *   SHOPIFY_SCOPES        – comma-separated scopes, e.g. "read_orders,write_orders"
 *   SHOPIFY_APP_URL       – public base URL of this server, e.g. "https://app.example.com"
 */

const crypto = require('crypto');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const { setSession } = require('./shopifySessionService');

/**
 * Build the Shopify OAuth permission URL.
 *
 * @param {string} shop  e.g. "my-store.myshopify.com"
 * @param {string} state  CSRF nonce
 * @returns {string}  URL to redirect the merchant to
 */
function buildAuthUrl (shop, state) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES || 'read_orders';
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/shopify/callback`;

  return `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(apiKey)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
}

/**
 * Verify the HMAC on the callback query string.
 * Shopify signs the callback parameters so we can confirm the request is genuine.
 *
 * @param {object} query  Express req.query
 * @returns {boolean}
 */
function verifyHmac (query) {
  const { hmac, ...rest } = query;
  if (!hmac || typeof hmac !== 'string') return false;

  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  // timingSafeEqual requires buffers of equal length
  try {
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(hmac, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Exchange the authorization code for a permanent access token.
 *
 * @param {string} shop  e.g. "my-store.myshopify.com"
 * @param {string} code  Authorization code from callback
 * @returns {Promise<string>}  Access token
 */
function exchangeToken (shop, code) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    });

    const options = {
      hostname: shop,
      path: '/admin/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`Shopify token exchange failed: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Look up or create a seller record for the given Shopify shop.
 *
 * Shopify sellers need a companion `users` row so that sellerController queries
 * (which JOIN sellers → users) continue to work unchanged.  We create a synthetic
 * users row with:
 *   email         = "shopify_{shop}" (unique, deterministic)
 *   password_hash = NULL             (migration 004 makes this nullable)
 *   role          = 'seller'
 *   email_verified = true            (OAuth counts as verified)
 *
 * @param {string} shop         e.g. "my-store.myshopify.com"
 * @param {string} accessToken  Permanent Shopify access token
 * @returns {Promise<{ sellerId: string, sub: string }>}
 */
async function upsertSeller (shop, accessToken) {
  // Check if seller already exists for this shop
  const existing = await db.query(
    `SELECT id, seller_id FROM sellers
     WHERE platform_type = 'shopify' AND platform_identifier = $1`,
    [shop]
  );

  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    // Update access token and re-install timestamp
    await db.query(
      `UPDATE sellers
       SET platform_access_token = $1,
           platform_installed_at = NOW(),
           platform_metadata = COALESCE(platform_metadata, '{}'::jsonb) || '{"uninstalled": false}'::jsonb
       WHERE id = $2`,
      [accessToken, row.id]
    );
    const result = { sellerId: row.seller_id, sub: row.id };
    setSession(shop, result);
    return result;
  }

  // Generate identifiers
  const sellerPublicId = 'sel_' + uuidv4().replace(/-/g, '').slice(0, 12);
  const syntheticEmail = `shopify_${shop}`;

  // Create (or reuse) the synthetic users row.
  // ON CONFLICT handles the edge case of a re-install after the seller row was deleted
  // but the user row still exists.
  const userRes = await db.query(
    `INSERT INTO users (email, password_hash, role, email_verified, is_active)
     VALUES ($1, NULL, 'seller', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE
       SET is_active = TRUE, updated_at = NOW()
     RETURNING id`,
    [syntheticEmail]
  );
  const userId = userRes.rows[0].id;

  // Create the seller row linked to the new user
  const insertRes = await db.query(
    `INSERT INTO sellers
       (user_id, seller_id, business_name, country,
        platform_type, platform_identifier,
        platform_access_token, platform_installed_at,
        plan, plan_daily_limit, plan_monthly_limit, plan_total_limit)
     VALUES ($1, $2, $3, 'US', 'shopify', $4, $5, NOW(),
             'trial', 5, 30, 100)
     RETURNING id, seller_id`,
    [userId, sellerPublicId, shop, shop, accessToken]
  );

  const newRow = insertRes.rows[0];
  const result = { sellerId: newRow.seller_id, sub: newRow.id };
  setSession(shop, result);
  return result;
}

module.exports = { buildAuthUrl, verifyHmac, exchangeToken, upsertSeller };
