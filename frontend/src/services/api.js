import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Não redirecionar em 401 se já estiver na página de login
    // ou se for uma requisição de login/register
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    const isOnLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register';

    if (error.response?.status === 401 && !isAuthEndpoint && !isOnLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
