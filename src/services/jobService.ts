import { apiService } from './api';

export type JobStatusFilter = 'all' | 'failed' | 'success';

export interface Job {
  id: string;
  clientId?: string;
  clientName?: string;
  fileName?: string;
  status?: string;
  createdAt?: string;
  errorMessage?: string;
}

export interface JobsListParams {
  limit?: number;
  status?: JobStatusFilter;
}

export async function getJobs(params?: JobsListParams): Promise<Job[]> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.status && params.status !== 'all') sp.set('status', params.status);
  const query = sp.toString();
  const data = await apiService.get<Job[] | { jobs: Job[] }>(`/admin/jobs${query ? `?${query}` : ''}`);
  return Array.isArray(data) ? data : (data as { jobs: Job[] }).jobs ?? [];
}

export async function getJobById(id: string): Promise<Job> {
  return apiService.get<Job>(`/admin/jobs/${id}`);
}

export async function retryJob(jobId: string): Promise<void> {
  await apiService.post(`/admin/jobs/${jobId}/retry`);
}
