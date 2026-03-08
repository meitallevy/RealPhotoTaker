/**
 * jwtAdapter.js  (platforms/jwt)
 *
 * Platform adapter for the original JWT-based Android sellers.
 * Handles requests that carry a "Authorization: Bearer <jwt>" header
 * or a ?token= query parameter.
 */

const PlatformAdapter = require('../base/PlatformAdapter');
const { extractToken, verifyToken } = require('./jwtAuth');

class JwtAdapter extends PlatformAdapter {
  getPlatformType () {
    return 'jwt';
  }

  canAuthenticate (req) {
    return !!extractToken(req);
  }

  async authenticate (req) {
    const token = extractToken(req);
    const decoded = verifyToken(token); // throws on invalid

    return {
      sellerId: decoded.sellerId,
      sub: decoded.sub,
      role: decoded.role || 'seller',
      platformType: 'jwt',
      // Preserve any extra JWT claims (e.g. email, iat, exp)
      ...decoded
    };
  }
}

module.exports = new JwtAdapter();
