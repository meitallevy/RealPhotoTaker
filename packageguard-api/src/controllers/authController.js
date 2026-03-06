/**
 * authController.js
 *
 * Thin HTTP layer for seller authentication. Each function extracts request data,
 * delegates all business logic to authService, and returns the result as JSON.
 * Errors are forwarded to the global error handler via next(err).
 *
 * Main exports:
 *   register(req, res, next)      – creates a new seller account; responds 201 on success
 *   login(req, res, next)         – verifies credentials; returns accessToken + refreshToken
 *   refreshToken(req, res, next)  – exchanges refreshToken for a new accessToken
 */

const authService = require('../services/authService');

async function register (req, res, next) {
  try {
    const result = await authService.registerSeller(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login (req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function refreshToken (req, res, next) {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refreshToken
};

