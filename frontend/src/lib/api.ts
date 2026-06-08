import axios from 'axios';
import { useAppStore } from '../stores/useStore';

const api = axios.create({
  // En dev : URL relative → proxy Vite (pas de CORS).
  // En prod : VITE_API_URL pointe vers le backend déployé.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAppStore.getState().refreshToken;
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken }
        );
        useAppStore.getState().setAuth(
          useAppStore.getState().user!,
          data.accessToken,
          data.refreshToken
        );
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAppStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
