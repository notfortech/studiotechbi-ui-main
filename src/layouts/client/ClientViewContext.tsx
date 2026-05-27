import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { canSelectReportClient } from '../../core/reportClientAccess';

export type ReportCategory = 'hr' | 'marketing' | 'financial';

interface ClientViewContextValue {
  reportCategory: ReportCategory;
  setReportCategory: (category: ReportCategory) => void;
  /** When `canSelectReportClient(user)`: client chosen on Reports via dropdown. */
  selectedClientCode: string;
  setSelectedClientCode: (clientCode: string) => void;
}

export const ClientViewContext = createContext<ClientViewContextValue | undefined>(undefined);

export const useClientView = () => {
  const ctx = useContext(ClientViewContext);
  if (!ctx) throw new Error('useClientView must be used within ClientViewProvider');
  return ctx;
};

interface ClientViewProviderProps {
  children: ReactNode;
}

export const ClientViewProvider = ({ children }: ClientViewProviderProps) => {
  const { user } = useAuth();
  const [reportCategory, setReportCategory] = useState<ReportCategory>('financial');
  const [selectedClientCode, setSelectedClientCode] = useState('');

  useEffect(() => {
    if (!canSelectReportClient(user)) {
      setSelectedClientCode('');
    }
  }, [user?.role, user?.userType]);

  return (
    <ClientViewContext.Provider
      value={{
        reportCategory,
        setReportCategory,
        selectedClientCode,
        setSelectedClientCode,
      }}
    >
      {children}
    </ClientViewContext.Provider>
  );
};
