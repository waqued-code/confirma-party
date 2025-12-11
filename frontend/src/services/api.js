import axios from 'axios';

// URL fixa da API em produção
const API_URL = 'https://confirma-party-api.onrender.com/api';

// Detecta ambiente
const getBaseURL = () => {
  // Variável de ambiente tem prioridade
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;

  // Apenas em desenvolvimento local usa proxy
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api';
  }

  // Produção: sempre usa a API do Render
  return API_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const pathname = window.location.pathname;
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    const isOnAuthPage = pathname.includes('/login') || pathname.includes('/register');

    // Redireciona para login em caso de 401 (não autorizado)
    if (error.response?.status === 401 && !isAuthEndpoint && !isOnAuthPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Usa o base path correto do app
      window.location.href = '/app/login';
    }

    return Promise.reject(error);
  }
);

export default api;
