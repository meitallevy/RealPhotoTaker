/**
 * shopifyAdapter.js  (platforms/shopify)
 *
 * Platform adapter for Shopify merchants authenticated via App Bridge session tokens.
 *
 * Detection: request has an "X-Shopify-Shop-Domain" header (sent by the React
 * frontend) or the Authorization header carries a Shopify session token (a JWT
 * signed with the app API secret rather than our own JWT_SECRET).
 *
 * Flow:
 *   1. Extract shop domain from header
 *   2. Verify the App Bridge session token signature
 *   3. Look up the seller record by shop domain (populated during OAuth)
 *   4. Return unified req.user
 */

const PlatformAdapter = require('../base/PlatformAdapter');
const { verifySessionToken, shopDomainFromPayload } = require('./shopifyAuth');
const { getSession } = require('./shopifySessionService');
const shopifyAdminService = require('./shopifyAdminService');
const db = require('../../config/database');

class ShopifyAdapter extends PlatformAdapter {
  getPlatformType () {
    return 'shopify';
  }

  /**
   * A request is Shopify if it carries the shop domain header that the
   * React frontend always attaches, or if the Authorization bearer looks
   * like a Shopify session token (has a "dest" claim in the payload).
   */
  canAuthenticate (req) {
    if (req.headers['x-shopify-shop-domain']) return true;
    // Quick payload peek — Shopify session tokens contain a "dest" field
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return false;
    try {
      const payloadB64 = header.slice(7).split('.')[1];
      if (!payloadB64) return false;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      // Use URL parsing to avoid subdomain-spoofing (e.g. evil.myshopify.com.attacker.com)
      if (!payload.dest) return false;
      const hostname = new URL(payload.dest).hostname;
      return hostname.endsWith('.myshopify.com');
    } catch {
      return false;
    }
  }

  async authenticate (req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    // Verify session token signature
    const payload = verifySessionToken(token);
    const shopDomain = shopDomainFromPayload(payload);

    // Fast path: in-memory session cache
    const cached = getSession(shopDomain);
    if (cached) {
      return {
        sellerId: cached.sellerId,
        sub: cached.sub,
        role: 'seller',
        platformType: 'shopify',
        shopDomain
      };
    }

    // Slow path: DB lookup (e.g. after server restart)
    const res = await db.query(
      `SELECT id, seller_id FROM sellers
       WHERE platform_type = 'shopify' AND platform_identifier = $1`,
      [shopDomain]
    );

    if (res.rowCount === 0) {
      throw new Error(`No seller found for Shopify shop: ${shopDomain}`);
    }

    const row = res.rows[0];
    return {
      sellerId: row.seller_id,
      sub: row.id,
      role: 'seller',
      platformType: 'shopify',
      shopDomain
    };
  }

  async validateOrder (sellerId, orderId) {
    return shopifyAdminService.validateOrder(sellerId, orderId);
  }

  async getOrderDetails (sellerId, orderId) {
    return shopifyAdminService.getOrderDetails(sellerId, orderId);
  }
}

module.exports = new ShopifyAdapter();
