import api from './api';

export const guestService = {
  getByParty: (partyId, status) => {
    const params = status ? { status } : {};
    return api.get(`/guests/party/${partyId}`, { params });
  },

  getById: (id) => api.get(`/guests/${id}`),

  create: (data) => api.post('/guests', data),

  update: (id, data) => api.put(`/guests/${id}`, data),

  updateStatus: (id, status) => api.patch(`/guests/${id}/status`, { status }),

  delete: (id) => api.delete(`/guests/${id}`),

  bulkDelete: (ids) => api.post('/guests/bulk-delete', { ids }),

  sendMessage: (id, message) => api.post(`/whatsapp/send/${id}`, { message }),
};
