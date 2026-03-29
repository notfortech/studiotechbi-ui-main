export const APP_NAME = 'StudioTechBI';

export const DRAWER_WIDTH = 260;
export const DRAWER_WIDTH_COLLAPSED = 72;

/** Centralized route paths for the app. Use these in routes, navigation, and redirects. */
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  ROOT: '/',
  LANDING: '/',
  DASHBOARD: '/dashboard',

  ADMIN: {
    BASE: '/admin',
    LOGIN: '/admin/login',
    DASHBOARD: '/admin/dashboard',
    TENANTS: '/admin/tenants',
    USERS: '/admin/users',
    CLIENTS: '/admin/clients',
    CLIENT_DETAILS: '/admin/clients/:clientId',
    TEMPLATES: '/admin/templates',
    POWERBI_ASSETS: '/admin/powerbi-assets',
    PIPELINE_MONITORING: '/admin/pipeline',
    FILE_UPLOAD_MONITORING: '/admin/file-uploads',
    DATASET_REFRESH_LOGS: '/admin/dataset-refresh',
    JOBS: '/admin/jobs',
    AUDIT_LOGS: '/admin/audit-logs',
    SYSTEM_HEALTH: '/admin/system-health',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
    LOGS_FUNCTIONAL: '/admin/logs/functional',
    LOGS_TECHNICAL: '/admin/logs/technical',
  },

  ACCOUNTANT: {
    BASE: '/accountant',
    DASHBOARD: '/accountant/dashboard',
    CLIENTS: '/accountant/clients',
    REPORTS: '/accountant/reports',
    INSIGHTS: '/accountant/insights',
  },

  CLIENT: {
    BASE: '/client',
    DASHBOARD: '/client/dashboard',
    REPORTS: '/client/reports',
    PROPOSITIONS: '/client/propositions',
    PROFILE: '/client/profile',
  },
} as const;

/** Trimmed, no trailing slash. Empty if unset — set VITE_API_BASE_URL at build time for Azure SWA. */
const rawApiBase = import.meta.env.VITE_API_BASE_URL;
console.log("API BASE URL:", import.meta.env.VITE_API_BASE_URL);
export const API_BASE_URL =
  typeof rawApiBase === 'string' && rawApiBase.trim() !== ''
    ? rawApiBase.trim().replace(/\/+$/, '')
    : '';
