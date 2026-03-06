/**
 * configRoutes.js
 *
 * Public configuration routes — no authentication required. Mounted at /v1/config in app.js.
 * The Android app fetches these on startup to get feature flags and capture instructions.
 *
 * GET /app     – general app settings (minimum version, features, legal URLs)
 * GET /capture – capture step definitions (photo instructions, nonce display config, limits)
 */

const express = require('express');
const router = express.Router();

const configController = require('../controllers/configController');

router.get('/app', configController.getAppConfig);
router.get('/capture', configController.getCaptureConfig);

module.exports = router;

