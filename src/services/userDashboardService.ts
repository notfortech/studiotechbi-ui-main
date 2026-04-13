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

/** camelCase JSON from GET /api/dashboard */
export interface PortalDashboardResponse {
  kpis: PortalDashboardKpis;
  chartData: PortalDashboardChartPoint[];
  quickActions: string[];
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
