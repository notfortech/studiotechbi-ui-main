import { apiService } from './api';

export interface DashboardStats {
  totalClients?: number;
  activeClients?: number;
  uploadsThisMonth?: number;
  validationFailures?: number;
  blobStorageUsed?: string;
  lastDatasetRefresh?: string;
}

export interface DashboardJob {
  id: string;
  clientId?: string;
  clientName?: string;
  fileName?: string;
  status?: string;
  createdAt?: string;
  errorMessage?: string;
}

/** Backend DashboardDto: summary for admin dashboard */
export interface DashboardResponse {
  totalTenants?: number;
  totalUsers?: number;
  totalClients?: number;
  activeClients?: number;
  activePipelines?: number;
  failedJobs?: number;
  datasetRefreshToday?: number;
  storageUsage?: string;
  uploadsThisMonth?: number;
  validationFailures?: number;
  blobStorageUsed?: string;
  lastDatasetRefresh?: string;
  recentJobs?: DashboardJob[];
  /** Pipeline runs per day for chart: [{ date, count }] */
  pipelineRunsPerDay?: { date: string; count: number }[];
  /** Dataset refresh success rate for chart: [{ date, successRate }] or similar */
  datasetRefreshSuccessRate?: { date: string; successRate: number; total?: number }[];
}

export async function getDashboard(): Promise<DashboardResponse> {
  return apiService.get<DashboardResponse>('/admin/dashboard');
}
