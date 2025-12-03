const express = require('express');
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Gerar mensagem de convite
router.post('/generate-invite/:partyId', aiController.generateInviteMessage);

// Regenerar mensagem com instruções adicionais
router.post('/regenerate-invite/:partyId', aiController.regenerateInviteMessage);

// Processar resposta de convidado
router.post('/process-response/:guestId', aiController.processGuestResponse);

module.exports = router;
