import { useAuth } from '../auth/AuthContext';

// A client's own logo + company name, swapped in for StudioTechBI's own wherever <Logo> is
// rendered inside an authenticated session. Sourced from the login/refresh response (User.
// companyName/logoUrl, set server-side only when an admin has uploaded a logo for that client
// via Admin > Clients > Branding -- see AdminClientsController.UploadLogo). Returns null for
// every client without one configured, which is the default StudioTechBI-branded experience.
export interface ClientBranding {
  companyName: string;
  logoUrl: string;
}

export function useClientBranding(): ClientBranding | null {
  const { user } = useAuth();
  if (!user?.companyName || !user?.logoUrl) return null;
  return { companyName: user.companyName, logoUrl: user.logoUrl };
}
