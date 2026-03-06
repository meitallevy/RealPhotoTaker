/**
 * rateLimit.js  (middleware)
 *
 * Applies a global rate limit of 100 requests per minute per IP address to every
 * endpoint in the API. Uses the express-rate-limit library with standard RateLimit
 * response headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).
 *
 * Exported as a single middleware function; registered in app.js before any routes.
 * Adjust the max/windowMs values here if stricter limits are needed for specific
 * endpoints (consider adding per-route limiters in those route files).
 */

const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = globalLimiter;

