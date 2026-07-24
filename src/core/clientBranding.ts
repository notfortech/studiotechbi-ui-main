import { useAuth } from '../auth/AuthContext';

// A client's own logo + company name, shown prominently alongside (not instead of) StudioTechBI's
// own branding inside an authenticated session -- see ClientSidebar. Sourced from the login/
// refresh response (User.companyName/logoUrl), which the server only populates when the client is
// both marked as a premium subscriber AND has a logo uploaded via Admin > Clients > Branding (see
// AuthService.MapUserToDtoAsync, AdminClientsController.UploadLogo). Returns null for every other
// client, which is the default StudioTechBI-only-branded experience.
export interface ClientBranding {
  companyName: string;
  logoUrl: string;
}

export function useClientBranding(): ClientBranding | null {
  const { user } = useAuth();
  if (!user?.companyName || !user?.logoUrl) return null;
  return { companyName: user.companyName, logoUrl: user.logoUrl };
}
