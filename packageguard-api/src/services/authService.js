/**
 * authService.js
 *
 * Handles seller registration, login, and JWT token refresh.
 * On registration a new user + seller record are created in a single transaction.
 * On login a short-lived access token (1 h) and a long-lived refresh token (7 d) are issued.
 * On refresh the seller_id is re-fetched from the DB so the new access token contains all
 * claims needed by the seller API endpoints (sub, sellerId, role).
 *
 * Main exports:
 *   registerSeller(payload)  – create user + seller; returns { userId, sellerId }
 *   login(payload)           – verify credentials; returns { accessToken, refreshToken }
 *   refreshToken(token)      – issue new access token from a valid refresh token
 *
 * Env vars: JWT_SECRET, JWT_REFRESH_SECRET
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');

const ACCESS_TOKEN_TTL_SECONDS = 3600;

async function registerSeller (payload) {
  const { email, password, businessName, country, webhookUrl } = payload;

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'seller')
       RETURNING id, email`,
      [email, passwordHash]
    );

    const user = userRes.rows[0];
    const sellerPublicId = `sel_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

    await client.query(
      `INSERT INTO sellers (user_id, seller_id, business_name, webhook_url, country)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sellerPublicId, businessName || null, webhookUrl || null, country || null]
    );

    await client.query('COMMIT');

    return {
      userId: user.id,
      sellerId: sellerPublicId,
      email: user.email,
      verificationRequired: true
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function login (payload) {
  const { email, password, deviceId, attestationToken } = payload;

  const res = await db.query(
    `SELECT u.id, u.email, u.password_hash, s.seller_id
     FROM users u
     JOIN sellers s ON s.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );

  if (res.rowCount === 0) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const user = res.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      sellerId: user.seller_id,
      role: 'seller'
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      deviceId
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // TODO: store session in Redis keyed by user+device
  // and optionally associate attestationToken for risk scoring.
  void attestationToken;

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: {
      userId: user.id,
      sellerId: user.seller_id,
      role: 'seller'
    }
  };
}

async function refreshToken (token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Re-fetch sellerId from DB so the new access token has the same claims as a fresh login.
    // Without this, seller endpoints that read req.user.sellerId would get undefined after refresh.
    const sellerRow = await db.query(
      'SELECT seller_id FROM sellers WHERE user_id = $1 LIMIT 1',
      [decoded.sub]
    );

    const accessToken = jwt.sign(
      {
        sub: decoded.sub,
        sellerId: sellerRow.rows[0]?.seller_id || null,
        role: 'seller'
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    };
  } catch (err) {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
}

module.exports = {
  registerSeller,
  login,
  refreshToken
};

