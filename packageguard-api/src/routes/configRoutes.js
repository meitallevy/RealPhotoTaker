const express = require('express');
const router = express.Router();

const configController = require('../controllers/configController');

router.get('/app', configController.getAppConfig);
router.get('/capture', configController.getCaptureConfig);

module.exports = router;

