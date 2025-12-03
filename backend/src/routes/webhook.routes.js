const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// Webhook público para Evolution API
router.post('/evolution', webhookController.handleEvolutionWebhook);

module.exports = router;
