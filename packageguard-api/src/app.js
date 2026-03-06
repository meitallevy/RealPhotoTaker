/**
 * app.js
 *
 * Express application entry point. Loads environment variables, wires security middleware
 * (Helmet, CORS), JSON body parsing, global rate limiting, all API route groups, and the
 * global error handler. The HTTP server is started when Node runs this file.
 *
 * Routes mounted:
 *   GET  /health         – liveness check → {"status":"ok"}
 *   /v1/auth   → authRoutes    (register, login, token refresh)
 *   /v1/config → configRoutes  (app settings, capture step definitions)
 *   /v1/claims → claimRoutes   (buyer claim flow — no auth required)
 *   /v1/seller → sellerRoutes  (seller operations — JWT required)
 *   /v1/verify → verifyRoutes  (public verification report)
 *
 * Env vars: PORT (default 4000)
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const claimRoutes = require('./routes/claimRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const verifyRoutes = require('./routes/verifyRoutes');

const app = express();

// Middleware to generate nonce for each request (used by verify page)
// Must run before Helmet so nonce is available for CSP
const crypto = require('crypto');
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Configure Helmet with CSP that allows inline scripts for verify page
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for verify page
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  })
);

app.use(
  cors({
    origin: '*'
  })
);
app.use(express.json({ limit: '10mb' }));

app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/v1/auth', authRoutes);
app.use('/v1/config', configRoutes);
app.use('/v1/claims', claimRoutes);
app.use('/v1/seller', sellerRoutes);
app.use('/v1/verify', verifyRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PackageGuard API listening on port ${PORT}`);
});

module.exports = app;

