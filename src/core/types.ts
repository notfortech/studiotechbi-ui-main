export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'accountant' | 'client';
  /**
   * When role is 'client': 0 = general (no accounting firm UI), 1 = accountant (toggle + Clients/Reports).
   * Omitted if API does not send it (legacy: treat as accountant-capable).
   */
  userType?: number;
  /** When role is 'client', true means they see Clients/Reports toggle (accountant-style view) */
  isAccountant?: boolean;
  /** Client code from login (e.g. AU-001). Used for reporting APIs and multi-tenant blob folder resolution. */
  clientCode?: string;
  /** Client display name when user belongs to a client. */
  clientName?: string;
  hasAIInsights?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: 'accountant' | 'client') => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
}