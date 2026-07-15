// White-label placeholder (Epic D1/D2 in the roadmap — not built yet).
// Shape a real branding API would return: a client's own logo + company
// name, swapped in for StudioTechBI's own wherever <Logo> is rendered
// inside an authenticated session. There's no backend endpoint for this
// yet, so this always returns null and every screen falls back to
// StudioTechBI's own branding -- exactly today's behaviour, unchanged,
// until a real premium-tier client has one to serve.
export interface ClientBranding {
  companyName: string;
  logoUrl: string;
}

export function useClientBranding(): ClientBranding | null {
  return null;
}
