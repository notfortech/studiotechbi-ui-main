import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';

export type ClientViewMode = 'reports' | 'clients';

export type ReportCategory = 'hr' | 'marketing' | 'financial';

interface ClientViewContextValue {
  viewMode: ClientViewMode;
  setViewMode: (mode: ClientViewMode) => void;
  reportCategory: ReportCategory;
  setReportCategory: (category: ReportCategory) => void;
  /** When true (and user is accountant client), show Clients | Reports workflow. When false, show HR/Marketing/Financial reports. */
  accountingFirmMode: boolean;
  setAccountingFirmMode: (value: boolean) => void;
  /** When accounting firm mode is on: client selected from Clients list for the Reports tab. */
  selectedClientCode: string;
  setSelectedClientCode: (clientCode: string) => void;
}

const ClientViewContext = createContext<ClientViewContextValue | undefined>(undefined);

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
  const [viewMode, setViewMode] = useState<ClientViewMode>('reports');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('financial');
  const [accountingFirmMode, setAccountingFirmMode] = useState(true);
  const [selectedClientCode, setSelectedClientCode] = useState('');

  /** General client users (UserType 0) never use accounting firm workflow — keep state consistent. */
  useEffect(() => {
    if (user?.role === 'client' && user.userType === 0) {
      setAccountingFirmMode(false);
      setViewMode('reports');
      setSelectedClientCode('');
    }
  }, [user?.role, user?.userType]);

  return (
    <ClientViewContext.Provider
      value={{
        viewMode,
        setViewMode,
        reportCategory,
        setReportCategory,
        accountingFirmMode,
        setAccountingFirmMode,
        selectedClientCode,
        setSelectedClientCode,
      }}
    >
      {children}
    </ClientViewContext.Provider>
  );
};
