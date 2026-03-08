/**
 * shopifyAdminService.js  (platforms/shopify)
 *
 * Optional Shopify Admin REST API client.
 * Used for platform-specific enhancements such as order validation.
 * Business logic calls these methods only when the platformType is 'shopify'.
 *
 * Env vars: none (credentials come from the seller row in the DB)
 */

const https = require('https');
const db = require('../../config/database');

/**
 * Fetch the stored access token for a Shopify seller.
 *
 * @param {string} sellerId  Public seller ID (sel_xxx)
 * @returns {Promise<{ accessToken: string, shopDomain: string } | null>}
 */
async function getCredentials (sellerId) {
  const res = await db.query(
    `SELECT platform_access_token, platform_identifier
     FROM sellers
     WHERE seller_id = $1 AND platform_type = 'shopify'`,
    [sellerId]
  );
  if (res.rowCount === 0) return null;
  return {
    accessToken: res.rows[0].platform_access_token,
    shopDomain: res.rows[0].platform_identifier
  };
}

/**
 * Make an authenticated GET request to the Shopify Admin REST API.
 *
 * @param {string} shopDomain  e.g. "my-store.myshopify.com"
 * @param {string} accessToken
 * @param {string} path        e.g. "/admin/api/2024-01/orders/123456789.json"
 * @returns {Promise<object>}
 */
function shopifyGet (shopDomain, accessToken, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: shopDomain,
      path,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Shopify response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Validate that an order exists and belongs to the given seller's Shopify store.
 *
 * @param {string} sellerId   Public seller ID
 * @param {string} orderId    Shopify order ID or order name (e.g. "#1001")
 * @returns {Promise<boolean>}
 */
async function validateOrder (sellerId, orderId) {
  const creds = await getCredentials(sellerId);
  if (!creds) return false;

  try {
    const data = await shopifyGet(
      creds.shopDomain,
      creds.accessToken,
      `/admin/api/2024-01/orders/${orderId}.json`
    );
    return !!(data && data.order && data.order.id);
  } catch {
    return false;
  }
}

/**
 * Fetch order details from Shopify.
 *
 * @param {string} sellerId
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
async function getOrderDetails (sellerId, orderId) {
  const creds = await getCredentials(sellerId);
  if (!creds) return null;

  try {
    const data = await shopifyGet(
      creds.shopDomain,
      creds.accessToken,
      `/admin/api/2024-01/orders/${orderId}.json`
    );
    return data && data.order ? data.order : null;
  } catch {
    return null;
  }
}

module.exports = { validateOrder, getOrderDetails };
