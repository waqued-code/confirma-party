import api from './api';

export const whatsappService = {
  getStatus: () => api.get('/whatsapp/status'),

  connect: () => api.post('/whatsapp/connect'),

  disconnect: () => api.post('/whatsapp/disconnect'),

  setWebhook: (webhookUrl) => api.post('/whatsapp/webhook', { webhookUrl }),
};
