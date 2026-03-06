/**
 * auth.js  (middleware)
 *
 * Express middleware that verifies the JWT Bearer token on every protected request.
 * Decodes the token and attaches the payload to req.user so downstream handlers can
 * read req.user.sellerId, req.user.sub, req.user.role without re-validating the token.
 *
 * Usage: add authenticate as a route-level or router-level middleware.
 *   router.get('/dashboard', authenticate, sellerController.getDashboard)
 *
 * Returns 401 JSON if the Authorization header is missing or the token is invalid/expired.
 *
 * Env vars: JWT_SECRET
 */

const jwt = require('jsonwebtoken');

function authenticate (req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { message: 'Missing token' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
}

module.exports = { authenticate };

