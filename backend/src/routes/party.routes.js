const express = require('express');
const partyController = require('../controllers/party.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../utils/multerConfig');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

router.post('/', partyController.create);
router.get('/', partyController.getAll);
router.get('/:id', partyController.getById);
router.put('/:id', partyController.update);
router.delete('/:id', partyController.delete);

// Upload de convidados
router.post('/:id/upload-guests', upload.single('file'), partyController.uploadGuests);

// Dashboard
router.get('/:id/dashboard', partyController.getDashboardStats);

module.exports = router;
