/**
 * jwtAuth.js  (platforms/jwt)
 *
 * Core JWT verification logic extracted from middleware/auth.js.
 * Used by the JWT platform adapter; the original middleware/auth.js
 * continues to work unchanged for backward compatibility.
 *
 * Env vars: JWT_SECRET
 */

const jwt = require('jsonwebtoken');

/**
 * Verify a Bearer token and return the decoded payload.
 * Throws if the token is missing, malformed, or expired.
 *
 * @param {string|null} token
 * @returns {{ sellerId: string, sub: string, role: string }}
 */
function verifyToken (token) {
  if (!token) {
    const err = new Error('Missing token');
    err.status = 401;
    throw err;
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Extract a Bearer token from a request.
 * Accepts Authorization header or ?token= query param (web UI fallback).
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken (req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.query.token) return req.query.token;
  return null;
}

module.exports = { verifyToken, extractToken };
