const express = require('express');
const whatsappController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Status e conexão
router.get('/status', whatsappController.getStatus);
router.post('/connect', whatsappController.connect);
router.post('/disconnect', whatsappController.disconnect);
router.post('/webhook', whatsappController.setWebhook);

// Envio de mensagens
router.post('/send/:guestId', whatsappController.sendToGuest);
router.post('/send-all/:partyId', whatsappController.sendToAllGuests);

module.exports = router;
