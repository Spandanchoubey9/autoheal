const express = require('express');
const router = express.Router();
const recoveryController = require('../services/recoveryController');

router.get('/status', (req, res) => {
  res.json(recoveryController.getStatus());
});

module.exports = router;
