import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../core/constants';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('authToken') ??
    localStorage.getItem('token') ??
    sessionStorage.getItem('authToken') ??
    sessionStorage.getItem('token')
  );
}

/**
 * Shared Axios instance for all API calls. Base URL comes from {@link API_BASE_URL} (`VITE_API_BASE_URL`).
 */
export const apiAxiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiAxiosInstance.interceptors.request.use(
  (config) => {
    if (import.meta.env.PROD && !config.baseURL && !apiAxiosInstance.defaults.baseURL) {
      return Promise.reject(
        new Error(
          'API base URL is not configured. Set VITE_API_BASE_URL to your App Service root including /api (e.g. https://your-api.azurewebsites.net/api) when building the frontend.'
        )
      );
    }
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('refreshToken');
      const isAdminPath =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      window.location.href = isAdminPath ? '/admin/login' : '/login';
    }
    return Promise.reject(error);
  }
);
