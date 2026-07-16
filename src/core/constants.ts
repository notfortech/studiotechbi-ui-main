export const APP_NAME = 'StudioTechBI';

/** Set to false to gate Reports “Generate AI Insights” from API (`user.hasAIInsights`). */
export const TEMP_FORCE_AI_INSIGHTS_FOR_ALL = true;

/** Set to false to gate Blueprint Generation from API (`user.hasBlueprints`). */
export const TEMP_FORCE_BLUEPRINTS_FOR_ALL = true;

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
    SCHEMA_MODEL_FIELD_ALIASES: '/admin/schema-model-aliases',
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
  },

  CLIENT: {
    BASE: '/client',
    DASHBOARD: '/client/dashboard',
    REPORTS: '/client/reports',
    REPORTS_VIEW: '/client/reports/view',
    BLUEPRINT: '/client/blueprint',
    REPORT_DESIGNER: '/client/report-designer',
    REPORT_GENERATOR: '/client/report-generator',
    PROPOSITIONS: '/client/propositions',
    PROFILE: '/client/profile',
  },
} as const;

/**
 * Temporary local backend (dev only). When `true`, API calls use localhost even if
 * `VITE_API_BASE_URL` points at Azure. Set to `false` (or remove) to restore normal env
 * resolution. Production builds never use this branch (`import.meta.env.DEV` is false).
 * Do not commit with `true` if your team relies on shared dev API from `.env`.
 */
const USE_LOCAL_API_IN_DEV = false;

/**
 * Default API host when `VITE_API_BASE_URL` is unset or still points at localhost.
 * Kept in sync with `.github/workflows/azure-static-web-apps-thankful-rock-087464e00.yml`.
 * Override with `VITE_API_BASE_URL` for a different environment (non-localhost).
 */
export const DEFAULT_AZURE_API_BASE_URL =
  'https://studiotechbi-api-acekguf6eqajd2gg.australiasoutheast-01.azurewebsites.net/api';

function trimApiBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isLocalhostApiBase(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(url.trim());
}

const rawApiBase = import.meta.env.VITE_API_BASE_URL;
const trimmedFromEnv =
  typeof rawApiBase === 'string' && rawApiBase.trim() !== '' ? trimApiBase(rawApiBase) : '';

const localDevApiBase = trimApiBase('http://localhost:5000/api');

export const API_BASE_URL = (() => {
  if (import.meta.env.DEV && USE_LOCAL_API_IN_DEV) {
    return localDevApiBase;
  }
  if (trimmedFromEnv && !isLocalhostApiBase(trimmedFromEnv)) {
    return trimmedFromEnv;
  }
  return trimApiBase(DEFAULT_AZURE_API_BASE_URL);
})();
