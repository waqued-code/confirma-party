const express = require('express');
const followupController = require('../controllers/followup.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Listar follow-ups de uma festa
router.get('/:partyId', followupController.getByParty);

// Criar ou atualizar follow-up
router.post('/:partyId', followupController.upsert);

// Deletar follow-up
router.delete('/:partyId/:order', followupController.delete);

module.exports = router;
