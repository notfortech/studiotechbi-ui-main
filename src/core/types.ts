export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'accountant' | 'client';
  /**
   * When role is 'client': 0 = general (single client, no picker); 1 = accountant (client dropdown on Reports).
   * See `canSelectReportClient` in reportClientAccess.ts.
   */
  userType?: number;
  /** When role is 'client', true if backend treats user as accountant (client dropdown on Reports). */
  isAccountant?: boolean;
  /** Client code from login (e.g. AU-001). Used for reporting APIs and multi-tenant blob folder resolution. */
  clientCode?: string;
  /** Client display name when user belongs to a client. */
  clientName?: string;
  /** White-label company display name -- only set (together with logoUrl) when the client has a
   * logo configured. See useClientBranding() in core/clientBranding.ts. */
  companyName?: string;
  /** Short-lived read SAS URL for the client's uploaded white-label logo. Undefined when no logo
   * is configured -- default StudioTechBI branding applies. Refreshed on every login/token refresh. */
  logoUrl?: string;
  hasAIInsights?: boolean;
  /** True when the user's plan includes Blueprint Generation. Controlled from the backend/Azure user mapping. */
  hasBlueprints?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: 'accountant' | 'client') => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Gated by API unless `TEMP_FORCE_AI_INSIGHTS_FOR_ALL` is enabled in constants. */
  hasAIInsights: boolean;
  /** True when the user's Azure/plan mapping grants blueprint generation access. */
  hasBlueprints: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
}