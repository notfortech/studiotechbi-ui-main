import { User } from '../core/types';
import { apiService } from './api';
import { clearReportEmbedCache } from './reportService';

const AUTH_TOKEN_KEY = 'authToken';
const USER_KEY = 'user';
const USER_ROLE_KEY = 'userRole';

export interface AdminLoginResponse {
  user: User;
  token: string;
}

/** Get value from object with camelCase or PascalCase (e.g. .NET APIs) */
function getProp(obj: any, ...keys: string[]): unknown {
  if (obj == null) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    const pascal = key.charAt(0).toUpperCase() + key.slice(1);
    if (obj[pascal] !== undefined && obj[pascal] !== null) return obj[pascal];
  }
  return undefined;
}

/** Normalize admin login response. Backend returns { accessToken, expiresAt, admin: { adminId, name, email, role } }. */
function normalizeAdminPayload(response: unknown): { user: User; token: string } {
  const data = (response as any)?.data ?? response;
  const token = getProp(data, 'accessToken', 'token') as string | undefined;
  if (!token) {
    throw new Error((getProp(data, 'message') as string) ?? 'No token in admin login response');
  }
  const raw = getProp(data, 'admin', 'user') ?? data;
  const email = (getProp(raw, 'email') ?? getProp(data, 'email')) as string ?? '';
  const name = (getProp(raw, 'name') ?? email) as string ?? 'Admin';
  const id = (getProp(raw, 'adminId', 'id', 'userId') as string)?.trim() || email || '';
  const user: User = {
    id,
    email,
    name,
    role: 'admin',
  };
  if (!user.email && !user.id) {
    throw new Error((getProp(data, 'message') as string) ?? 'Invalid admin login response');
  }
  return { user, token };
}

export async function adminLogin(
  email: string,
  password: string
): Promise<AdminLoginResponse> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await apiService.post<unknown>('/admin/login', { email, password });
    const hasPayload =
      response != null &&
      (typeof response !== 'object' ||
        'data' in response ||
        'token' in response ||
        'accessToken' in response ||
        'Token' in response ||
        'AccessToken' in response ||
        'admin' in response ||
        'Admin' in response);
    if (!hasPayload) {
      throw new Error(
        'Empty or invalid response from server. Set VITE_API_BASE_URL in .env to your API base (e.g. https://your-api.com/api) and restart the dev server.'
      );
    }
    const { user, token } = normalizeAdminPayload(response);

    clearReportEmbedCache();
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(USER_ROLE_KEY, 'admin');

    return { user, token };
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string; error?: string } }; message?: string; code?: string };
    const isNetworkOrParse =
      ax.message?.includes('Network Error') ||
      ax.message?.includes('failed to load') ||
      ax.code === 'ERR_NETWORK' ||
      (ax.response?.status === 200 && ax.response?.data == null);
    const msg = isNetworkOrParse
      ? 'Could not read server response. Set VITE_API_BASE_URL in .env to your HTTPS API base (same as Swagger, e.g. https://your-api.com/api), then restart the dev server.'
      : ax.response?.data?.message ??
        ax.response?.data?.error ??
        ax.message ??
        'Admin login failed. Check your credentials.';
    throw new Error(typeof msg === 'string' ? msg : 'Admin login failed');
  }
}
