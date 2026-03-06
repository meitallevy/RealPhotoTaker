/**
 * verifyRoutes.js
 *
 * Public claim verification route — no authentication required. Mounted at /v1/verify.
 * Anyone with a claimId can view the evidence report (by design — buyers share this link).
 *
 * GET /:claimId  – returns a styled HTML verification report for browsers,
 *                  or JSON verification data when the Accept header requests application/json
 */

const express = require('express');
const router = express.Router();

const verifyController = require('../controllers/verifyController');

router.get('/:claimId', verifyController.publicVerify);

module.exports = router;

