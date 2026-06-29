import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TEMP_FORCE_AI_INSIGHTS_FOR_ALL, TEMP_FORCE_BLUEPRINTS_FOR_ALL } from '../core/constants';
import { AuthContextType, User } from '../core/types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getStoredUser();
      if (storedUser && authService.getStoredToken()) {
        setUser(storedUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, role: 'accountant' | 'client') => {
    const response = await authService.login(email, password);
    setUser(response.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authService.register(name, email, password);
    setUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasAIInsights: TEMP_FORCE_AI_INSIGHTS_FOR_ALL || !!user?.hasAIInsights,
    hasBlueprints: TEMP_FORCE_BLUEPRINTS_FOR_ALL || !!user?.hasBlueprints,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
