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
