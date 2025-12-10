import api from './api';

export const adminService = {
  // Dashboard geral
  getDashboard: () => api.get('/admin/dashboard'),

  // Usuários
  getAllUsers: () => api.get('/admin/users'),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  toggleUserAdmin: (userId, isAdmin) => api.patch(`/admin/users/${userId}/admin`, { isAdmin }),

  // Festas
  getAllParties: () => api.get('/admin/parties'),

  // Estatísticas de mensagens
  getMessageStats: () => api.get('/admin/messages/stats'),
};
