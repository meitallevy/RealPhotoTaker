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
  // Try Authorization header first (Bearer token), then query parameter (for web access)
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  // Fallback to query parameter for web UI access
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    // For web routes, return HTML error page; for API, return JSON
    if (req.path && req.path.includes('/web/')) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html><head><title>Unauthorized</title></head>
        <body><h1>401 Unauthorized</h1><p>Missing or invalid authentication token.</p>
        <p><a href="/v1/auth/login">Login</a></p></body></html>
      `);
    }
    return res.status(401).json({ error: { message: 'Missing token' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // For web routes, return HTML error page; for API, return JSON
    if (req.path && req.path.includes('/web/')) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html><head><title>Unauthorized</title></head>
        <body><h1>401 Unauthorized</h1><p>Invalid or expired authentication token.</p>
        <p><a href="/v1/auth/login">Login</a></p></body></html>
      `);
    }
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
}

module.exports = { authenticate };

