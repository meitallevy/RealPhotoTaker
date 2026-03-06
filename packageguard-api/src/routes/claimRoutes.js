/**
 * claimRoutes.js
 *
 * Buyer claim submission routes — no authentication required (buyers do not have accounts).
 * Mounted at /v1/claims in app.js.
 *
 * POST /initiate              – start a new claim; returns claimId + nonce
 * POST /:claimId/evidence     – upload one evidence photo (multipart/form-data, chunked supported)
 * POST /:claimId/complete     – signal all uploads are done; triggers background processing
 * GET  /:claimId/status       – poll claim processing status
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'tmp_uploads' });

const claimController = require('../controllers/claimController');

// Auth is optional for buyers per spec: "optional for buyers"
router.post('/initiate', claimController.initiate);
router.post('/:claimId/evidence', upload.single('file'), claimController.uploadEvidence);
router.post('/:claimId/complete', claimController.complete);
router.get('/:claimId/status', claimController.status);

module.exports = router;
