import { User } from '../core/types';
import { apiService } from './api';
import { clearReportEmbedCache } from './reportService';

const AUTH_TOKEN_KEY = 'authToken';
const USER_KEY = 'user';
const USER_ROLE_KEY = 'userRole';

interface AuthResponse {
  user: User;
  token: string;
}

/** Backend can return { data: { user, accessToken, refreshToken } } or flat { user, accessToken, refreshToken } */
function normalizeAuthPayload(response: any): {
  user: User;
  accessToken: string;
  refreshToken?: string;
} {
  const data = response?.data ?? response;
  if (!data?.user || !data?.accessToken) {
    throw new Error(data?.message || 'Invalid login response from server');
  }
  const userType =
    typeof data.user.userType === 'number'
      ? data.user.userType
      : data.user.userType != null && !Number.isNaN(Number(data.user.userType))
        ? Number(data.user.userType)
        : undefined;
  const user: User = {
    ...data.user,
    id: data.user.id ?? data.user.userId ?? '',
    email: data.user.email ?? '',
    name: data.user.name ?? data.user.email ?? 'User',
    role: (() => {
      const r = (data.user.roles?.[0] ?? data.user.role ?? 'client').toString().toLowerCase();
      return (r === 'accountant' || r === 'admin' || r === 'client') ? r : 'client';
    })(),
    userType,
    isAccountant: !!data.user.isAccountant || userType === 1,
    clientCode: data.user.clientCode ?? data.user.clientId ?? undefined,
    clientName: data.user.clientName ?? undefined,
    hasAIInsights: !!data.user.hasAIInsights,
    hasBlueprints: !!data.user.hasBlueprints,
  };
  return {
    user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      const response = await apiService.post<any>('Auth/login', { email, password });
      const authData = normalizeAuthPayload(response);

      const roleKey = (authData.user.role === 'accountant' || authData.user.role === 'client')
        ? authData.user.role
        : 'client';
      clearReportEmbedCache();
      this.storeAuthData(authData.user, authData.accessToken, roleKey);

      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }

      return {
        user: authData.user,
        token: authData.accessToken,
      };
    } catch (err: any) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        'Login failed. Check your credentials and try again.';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    if (!name || !email || !password) {
      throw new Error('Name, email and password are required');
    }

    try {
      const response = await apiService.post<any>('Auth/register', { name, email, password });
      const authData = normalizeAuthPayload(response);

      const roleKey = (authData.user.role === 'accountant' || authData.user.role === 'client')
        ? authData.user.role
        : 'client';
      clearReportEmbedCache();
      this.storeAuthData(authData.user, authData.accessToken, roleKey);

      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }

      return {
        user: authData.user,
        token: authData.accessToken,
      };
    } catch (err: any) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        'Sign up failed. Please try again.';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  private storeAuthData(user: User, token: string, role: 'accountant' | 'client'): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(USER_ROLE_KEY, role);
  }

  getStoredUser(): User | null {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getUserRole(): 'admin' | 'accountant' | 'client' | null {
    const role = localStorage.getItem(USER_ROLE_KEY);
    return (role === 'admin' || role === 'accountant' || role === 'client' ? role : null) || null;
  }

  logout(): void {
    clearReportEmbedCache();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken() && !!this.getStoredUser();
  }
}

export const authService = new AuthService();
