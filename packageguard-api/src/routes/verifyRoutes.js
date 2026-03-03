const express = require('express');
const router = express.Router();

const verifyController = require('../controllers/verifyController');

router.get('/:claimId', verifyController.publicVerify);

module.exports = router;

