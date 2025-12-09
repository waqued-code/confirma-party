const express = require('express');
const messageFlowController = require('../controllers/messageFlow.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Rotas públicas
router.get('/guidelines', messageFlowController.getGuidelines);
router.post('/validate', messageFlowController.validateMessage);

// Rota para cron job (usa header secreto)
router.post('/process-queue', messageFlowController.processQueue);

// Rotas autenticadas
router.use(authMiddleware);

// Gerenciamento de template
router.post('/:partyId/submit', messageFlowController.submitMessage);
router.get('/:partyId/status', messageFlowController.getTemplateStatus);

// Envio de mensagens
router.post('/:partyId/test', messageFlowController.sendTestMessage);
router.post('/:partyId/send-all', messageFlowController.sendToAllGuests);

// Gerenciamento de fila
router.get('/:partyId/queue-stats', messageFlowController.getQueueStats);
router.post('/:partyId/cancel', messageFlowController.cancelPendingMessages);

// Resumo
router.get('/:partyId/summary', messageFlowController.getSummary);

module.exports = router;
