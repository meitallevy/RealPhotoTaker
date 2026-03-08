/**
 * app.js
 *
 * Express application entry point. Loads environment variables, wires security middleware
 * (Helmet, CORS), JSON body parsing, global rate limiting, all API route groups, and the
 * global error handler. The HTTP server is started when Node runs this file.
 *
 * Routes mounted:
 *   GET  /health              – liveness check → {"status":"ok"}
 *   /v1/auth   → authRoutes    (register, login, token refresh)
 *   /v1/config → configRoutes  (app settings, capture step definitions)
 *   /v1/claims → claimRoutes   (buyer claim flow — no auth required)
 *   /v1/seller → sellerRoutes  (seller operations — auth abstraction: JWT or Shopify)
 *   /v1/verify → verifyRoutes  (public verification report)
 *   /auth/shopify → shopifyRoutes  (Shopify OAuth installation flow)
 *   /webhooks     → webhookRoutes  (platform webhooks — raw body, HMAC verified)
 *   /shopify/*    → static files   (Shopify React embedded app)
 *
 * Env vars: PORT (default 4000)
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const claimRoutes = require('./routes/claimRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const shopifyRoutes = require('./routes/shopifyRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Middleware to generate nonce for each request (used by verify page)
// Must run before Helmet so nonce is available for CSP
const crypto = require('crypto');
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Configure Helmet with CSP that allows inline scripts for verify page and Shopify CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.shopify.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.shopify.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.myshopify.com'],
        frameSrc: ["'self'", 'https://admin.shopify.com']
      }
    },
    // Allow embedding in Shopify Admin iframe
    frameguard: { action: 'sameorigin' }
  })
);

// All auth uses Bearer tokens (not cookies), so credentials:true is not needed.
// origin:true reflects the request's own origin, which allows every caller
// (Android app, Shopify embedded app, curl) without the invalid *+credentials combo.
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Shop-Domain']
  })
);

// Webhook routes must be mounted BEFORE express.json() so the raw body
// is available for Shopify HMAC signature verification.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));

app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Shopify OAuth installation flow
app.use('/auth/shopify', shopifyRoutes);

// Core API routes
app.use('/v1/auth', authRoutes);
app.use('/v1/config', configRoutes);
app.use('/v1/claims', claimRoutes);
app.use('/v1/seller', sellerRoutes);
app.use('/v1/verify', verifyRoutes);

// Shopify embedded React app (built files served from public/shopify/)
const shopifyPublicDir = path.join(__dirname, '../public/shopify');
app.use('/shopify', express.static(shopifyPublicDir));
app.get('/shopify/*', (req, res) => {
  res.sendFile(path.join(shopifyPublicDir, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PackageGuard API listening on port ${PORT}`);
});

module.exports = app;
