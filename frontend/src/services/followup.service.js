import api from './api';

export const followupService = {
  getByParty: (partyId) => api.get(`/followups/${partyId}`),

  upsert: (partyId, data) => api.post(`/followups/${partyId}`, data),

  delete: (partyId, order) => api.delete(`/followups/${partyId}/${order}`),
};
