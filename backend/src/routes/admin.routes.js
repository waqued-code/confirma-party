const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = express.Router();

// Todas as rotas de admin precisam de autenticação e ser admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard geral
router.get('/dashboard', adminController.getDashboard);

// Usuários
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/admin', adminController.toggleUserAdmin);

// Festas
router.get('/parties', adminController.getAllParties);

// Estatísticas de mensagens
router.get('/messages/stats', adminController.getMessageStats);

module.exports = router;
