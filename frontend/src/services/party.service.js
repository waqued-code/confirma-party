import api from './api';

export const partyService = {
  getAll: () => api.get('/parties'),

  getById: (id) => api.get(`/parties/${id}`),

  create: (data) => api.post('/parties', data),

  update: (id, data) => api.put(`/parties/${id}`, data),

  delete: (id) => api.delete(`/parties/${id}`),

  uploadGuests: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/parties/${id}/upload-guests`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getDashboard: (id) => api.get(`/parties/${id}/dashboard`),

  generateInviteMessage: (id) => api.post(`/ai/generate-invite/${id}`),

  regenerateInviteMessage: (id, instructions) =>
    api.post(`/ai/regenerate-invite/${id}`, { instructions }),

  sendToAllGuests: (id) => api.post(`/whatsapp/send-all/${id}`),

  sendTestMessage: (id) => api.post(`/whatsapp/send-test/${id}`),
};
