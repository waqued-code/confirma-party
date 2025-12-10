const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// Evolution API - Webhook principal
router.post('/evolution', webhookController.handleEvolutionWebhook);

module.exports = router;
