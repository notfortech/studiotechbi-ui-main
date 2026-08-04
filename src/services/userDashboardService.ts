import { apiService } from './api';

export interface PortalDashboardKpis {
  totalBalance: number;
  activeReports: number;
  propositions: number;
  growthRate: number;
}

export interface PortalDashboardChartPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  variance: number | null;
}

/** ActionKey is null/absent for the original, purely informational items (rendered exactly as
 * before — plain text, no click affordance). Only a recognized key (currently just
 * "view-report-stats") makes an item clickable. */
export interface PortalQuickAction {
  label: string;
  actionKey?: string | null;
}

/** camelCase JSON from GET /api/dashboard */
export interface PortalDashboardResponse {
  kpis: PortalDashboardKpis;
  chartData: PortalDashboardChartPoint[];
  quickActions: PortalQuickAction[];
  role: string;
}

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 12;

function clampMonths(months?: number): number {
  const n = months ?? DEFAULT_MONTHS;
  return Math.min(MAX_MONTHS, Math.max(1, Math.floor(n)));
}

/**
 * GET {API_BASE}/dashboard with Bearer token (via apiService).
 * API_BASE should include /api (e.g. VITE_API_BASE_URL).
 */
export async function getPortalDashboard(options?: {
  months?: number;
  /** Accountant only: Guid when a single client is selected; omit for firm aggregate view. */
  clientId?: string;
}): Promise<PortalDashboardResponse> {
  const months = clampMonths(options?.months);
  const params: Record<string, string | number> = { months };
  const id = options?.clientId?.trim();
  if (id) params.clientId = id;

  return apiService.get<PortalDashboardResponse>('/dashboard', { params });
}
