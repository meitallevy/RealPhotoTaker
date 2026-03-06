/**
 * authRoutes.js
 *
 * Public authentication routes — no JWT required. Mounted at /v1/auth in app.js.
 *
 * POST /register  – create a new seller account (email + password + business name)
 * POST /login     – verify credentials; returns accessToken + refreshToken
 * POST /refresh   – exchange a valid refreshToken for a new accessToken
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

module.exports = router;

