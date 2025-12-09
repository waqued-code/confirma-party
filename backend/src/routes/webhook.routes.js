const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// WhatsApp Cloud API (Meta) - Webhook principal
router.get('/whatsapp', webhookController.verifyWhatsAppWebhook);   // Verificação
router.post('/whatsapp', webhookController.handleWhatsAppWebhook); // Mensagens

// Evolution API (Legacy)
router.post('/evolution', webhookController.handleEvolutionWebhook);

module.exports = router;
