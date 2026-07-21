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

/**
 * Timeout for AI-backed calls (schema-model matching, report-model generation) that route
 * through stbi_transformers to an LLM. Set with margin above koru-main's own outbound timeout
 * to that service (330s — see StudioTechBI.Application.Models.ReportDesignerOptions in
 * koru-main) so the UI doesn't cut the user off before the backend would have succeeded on
 * its own. Not applied as the axios default — other calls (file upload, SharePoint browse)
 * should keep failing fast rather than waiting several minutes.
 */
export const AI_MATCH_TIMEOUT_MS = 340_000;

/**
 * Timeout for the Dashboard Template Generator (POST /dashboard-template/generate), which chains
 * TMDL authoring (same stbi_transformers hop as AI_MATCH_TIMEOUT_MS, up to ~330s) with a Power BI
 * PBIP import that itself polls for up to ~60s server-side, plus gateway/refresh calls on top.
 * Extra margin over AI_MATCH_TIMEOUT_MS to cover that added round-trip.
 */
export const DASHBOARD_TEMPLATE_TIMEOUT_MS = 480_000;

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
