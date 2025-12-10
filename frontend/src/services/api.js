import axios from 'axios';

// Detecta ambiente de produção no Render
const getBaseURL = () => {
  // Se VITE_API_URL estiver definido, usa ele
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Em produção (Render), usa a URL da API
  if (window.location.hostname.includes('onrender.com') ||
      window.location.hostname === 'confirma.party') {
    return 'https://confirma-party-api.onrender.com/api';
  }

  // Em desenvolvimento, usa proxy
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
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
