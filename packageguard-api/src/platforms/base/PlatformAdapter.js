/**
 * PlatformAdapter.js  (platforms/base)
 *
 * Abstract base class that every platform adapter must extend.
 *
 * Implementing a new platform:
 *   1. Create platforms/{platform}/{platform}Adapter.js
 *   2. Extend PlatformAdapter and override all required methods
 *   3. Register the instance in platforms/registry.js
 *
 * All adapters must resolve authentication to the same req.user shape:
 *   { sellerId, sub, role, platformType }
 * where:
 *   sellerId     — the seller's public identifier (e.g. "sel_xxxxx")
 *   sub          — internal UUID of the seller row
 *   role         — always 'seller'
 *   platformType — matches getPlatformType() (e.g. 'jwt', 'shopify')
 */

class PlatformAdapter {
  /**
   * Returns the platform identifier string, e.g. 'jwt', 'shopify', 'wix'.
   * Must be unique across all registered adapters.
   * @returns {string}
   */
  getPlatformType () {
    throw new Error(`${this.constructor.name} must implement getPlatformType()`);
  }

  /**
   * Synchronous check: does this request look like it belongs to this platform?
   * Used to skip calling authenticate() when there is nothing to try.
   *
   * @param {import('express').Request} req
   * @returns {boolean}
   */
  canAuthenticate (req) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement canAuthenticate(req)`);
  }

  /**
   * Authenticate the request and return the unified user object.
   * Throw any error if authentication fails; the registry will try the next adapter.
   *
   * @param {import('express').Request} req
   * @returns {Promise<{sellerId: string, sub: string, role: string, platformType: string}>}
   */
  async authenticate (req) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement authenticate(req)`);
  }

  /**
   * Optional: validate that an order belongs to the given seller on this platform.
   * Return true if valid, false if not found / not owned, throw on API error.
   *
   * @param {string} sellerId
   * @param {string} orderId
   * @returns {Promise<boolean>}
   */
  async validateOrder (sellerId, orderId) { // eslint-disable-line no-unused-vars
    return true; // Default: no validation
  }

  /**
   * Optional: fetch order details from the platform.
   *
   * @param {string} sellerId
   * @param {string} orderId
   * @returns {Promise<object|null>}
   */
  async getOrderDetails (sellerId, orderId) { // eslint-disable-line no-unused-vars
    return null; // Default: not supported
  }
}

module.exports = PlatformAdapter;
