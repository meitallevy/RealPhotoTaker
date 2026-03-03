const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const sellerController = require('../controllers/sellerController');

router.get('/dashboard', authenticate, sellerController.getDashboard);
router.get('/claims', authenticate, sellerController.getClaims);
router.get('/claims/:claimId', authenticate, sellerController.getClaimDetail);
router.get('/claims/:claimId/evidence/:evidenceId/image', authenticate, sellerController.getEvidenceImage);
router.patch('/settings', authenticate, sellerController.updateSettings);

module.exports = router;

