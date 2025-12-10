const express = require('express');
const whatsappController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// ============================================
// Rotas públicas (qualquer usuário autenticado)
// ============================================

// Status - qualquer usuário pode ver o status do WhatsApp da plataforma
router.get('/status', whatsappController.getStatus);

// Envio de mensagens - usa o WhatsApp da plataforma para enviar
router.post('/send/:guestId', whatsappController.sendToGuest);
router.post('/send-all/:partyId', whatsappController.sendToAllGuests);
router.post('/send-test/:partyId', whatsappController.sendTestMessage);

// ============================================
// Rotas administrativas (apenas admin)
// ============================================

// Configuração do WhatsApp da plataforma - apenas admin
router.post('/connect', adminMiddleware, whatsappController.connect);
router.post('/disconnect', adminMiddleware, whatsappController.disconnect);
router.post('/reset', adminMiddleware, whatsappController.resetConnection);
router.post('/webhook', adminMiddleware, whatsappController.setWebhook);

module.exports = router;
