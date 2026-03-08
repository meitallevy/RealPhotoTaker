/**
 * sellerRoutes.js
 *
 * Authenticated seller routes — all require a valid JWT Bearer token (checked by the
 * authenticate middleware). Mounted at /v1/seller in app.js.
 *
 * GET   /dashboard                            – stats, plan limits, seller ID
 * GET   /claims                               – paginated claims list (filter by status/date)
 * GET   /claims/:claimId                      – full claim detail with evidence (auto-marks viewed)
 * GET   /claims/:claimId/evidence/:id/image   – stream evidence photo from Supabase Storage
 * PATCH /claims/:claimId/review               – submit decision (APPROVED/REJECTED/MORE_INFO_REQUESTED)
 * PATCH /settings                             – update email, webhook URL, notification preferences
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authAbstraction');
const sellerController = require('../controllers/sellerController');
const sellerWebController = require('../controllers/sellerWebController');

// API routes (JSON responses)
router.get('/dashboard', authenticate, sellerController.getDashboard);
router.get('/claims', authenticate, sellerController.getClaims);
router.get('/claims/:claimId', authenticate, sellerController.getClaimDetail);
router.get('/claims/:claimId/evidence/:evidenceId/image', authenticate, sellerController.getEvidenceImage);
router.patch('/claims/:claimId/review', authenticate, sellerController.reviewClaim);
router.patch('/settings', authenticate, sellerController.updateSettings);

// Web UI routes (HTML responses)
router.get('/web/dashboard', authenticate, sellerWebController.dashboard);
router.get('/web/claims', authenticate, sellerWebController.claimsList);
router.get('/web/claims/:claimId', authenticate, sellerWebController.claimDetail);

module.exports = router;

