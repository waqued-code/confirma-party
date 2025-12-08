const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rotas públicas
router.get('/plans', paymentController.getPlans);

// Rotas protegidas
router.post('/calculate-upgrade', authMiddleware, paymentController.calculateUpgrade);
router.post('/checkout', authMiddleware, paymentController.createCheckout);
router.get('/verify/:sessionId', authMiddleware, paymentController.verifySession);
router.post('/confirm/:paymentId', authMiddleware, paymentController.confirmPayment);
router.get('/history/:partyId', authMiddleware, paymentController.getPaymentHistory);
router.post('/manual-upgrade', authMiddleware, paymentController.manualUpgrade);

module.exports = router;
