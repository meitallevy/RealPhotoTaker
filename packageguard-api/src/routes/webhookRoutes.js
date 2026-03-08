/**
 * webhookRoutes.js
 *
 * Platform webhook receivers. Mounted at /webhooks in app.js with
 * express.raw({ type: 'application/json' }) so the raw body is available
 * for HMAC verification before JSON parsing.
 *
 * POST /webhooks/shopify/app/uninstalled
 * POST /webhooks/shopify/orders/create
 * POST /webhooks/shopify/orders/updated
 */

const express = require('express');
const router = express.Router();
const shopifyWebhookService = require('../services/shopifyWebhookService');

/**
 * Verify Shopify HMAC and attach webhook metadata to req.
 */
function verifyShopifyWebhook (req, res, next) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const topic = req.get('X-Shopify-Topic');
  const shop = req.get('X-Shopify-Shop-Domain');

  if (!shopifyWebhookService.verifyWebhook(req.body, hmac)) {
    return res.status(401).send('Unauthorized');
  }

  req.webhookTopic = topic;
  req.webhookShop = shop;
  next();
}

router.post('/shopify/app/uninstalled', verifyShopifyWebhook, shopifyWebhookService.handleUninstall);
router.post('/shopify/orders/create', verifyShopifyWebhook, shopifyWebhookService.handleOrderCreate);
router.post('/shopify/orders/updated', verifyShopifyWebhook, shopifyWebhookService.handleOrderUpdate);

module.exports = router;
