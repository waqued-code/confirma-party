import api from './api';

export const paymentService = {
  getPlans: () => api.get('/payments/plans'),

  calculateUpgrade: (partyId, targetPlan) =>
    api.post('/payments/calculate-upgrade', { partyId, targetPlan }),

  createCheckout: (partyId, targetPlan, successUrl, cancelUrl) =>
    api.post('/payments/checkout', { partyId, targetPlan, successUrl, cancelUrl }),

  verifySession: (sessionId) =>
    api.get(`/payments/verify/${sessionId}`),

  confirmPayment: (paymentId) =>
    api.post(`/payments/confirm/${paymentId}`),

  getPaymentHistory: (partyId) =>
    api.get(`/payments/history/${partyId}`),
};
