/**
 * shopifyWebhookService.js  (services)
 *
 * Handlers for Shopify webhook events.
 * Each handler receives (req, res) where req.body is the raw Buffer
 * (app.js mounts these routes with express.raw() to preserve the body for HMAC).
 *
 * Env vars: SHOPIFY_WEBHOOK_SECRET
 */

const crypto = require('crypto');
const db = require('../config/database');
const { deleteSession } = require('../platforms/shopify/shopifySessionService');

/**
 * Verify Shopify webhook HMAC-SHA256 signature.
 *
 * @param {Buffer} rawBody
 * @param {string} hmacHeader  Value of X-Shopify-Hmac-Sha256 header
 * @returns {boolean}
 */
function verifyWebhook (rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;

  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

/**
 * Handle app/uninstalled webhook.
 * Marks the seller as uninstalled and removes the in-memory session.
 */
async function handleUninstall (req, res) {
  try {
    const shop = req.webhookShop;
    if (!shop) return res.status(400).send('Missing shop');

    // Clear in-memory session
    deleteSession(shop);

    // Mark seller as uninstalled in DB
    await db.query(
      `UPDATE sellers
       SET platform_metadata = COALESCE(platform_metadata, '{}'::jsonb) || '{"uninstalled": true}'::jsonb
       WHERE platform_type = 'shopify' AND platform_identifier = $1`,
      [shop]
    );

    return res.status(200).send('OK');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[shopifyWebhook] handleUninstall error:', err);
    return res.status(500).send('Internal error');
  }
}

/**
 * Handle orders/create webhook.
 * Optional: auto-link future claims to platform orders.
 * Currently a no-op stub; uncomment and extend as needed.
 */
async function handleOrderCreate (req, res) {
  // const order = JSON.parse(req.body.toString());
  // TODO: store order metadata if needed
  return res.status(200).send('OK');
}

/**
 * Handle orders/updated webhook.
 */
async function handleOrderUpdate (req, res) {
  return res.status(200).send('OK');
}

module.exports = { verifyWebhook, handleUninstall, handleOrderCreate, handleOrderUpdate };
