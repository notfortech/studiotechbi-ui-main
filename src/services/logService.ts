import { apiService } from './api';

export interface FunctionalLogEntry {
  id?: string;
  eventType?: string;
  client?: string;
  description?: string;
  timestamp?: string;
}

export interface TechnicalLogEntry {
  id?: string;
  service?: string;
  level?: string;
  message?: string;
  timestamp?: string;
}

export interface FunctionalLogsParams {
  limit?: number;
  clientId?: string;
}

export interface TechnicalLogsParams {
  limit?: number;
  level?: string;
}

export async function getFunctionalLogs(params?: FunctionalLogsParams): Promise<FunctionalLogEntry[]> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.clientId) sp.set('clientId', params.clientId);
  const q = sp.toString();
  const data = await apiService.get<FunctionalLogEntry[] | { logs: FunctionalLogEntry[] }>(
    `/admin/logs/functional${q ? `?${q}` : ''}`
  );
  return Array.isArray(data) ? data : (data as { logs: FunctionalLogEntry[] }).logs ?? [];
}

export async function getTechnicalLogs(params?: TechnicalLogsParams): Promise<TechnicalLogEntry[]> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.level) sp.set('level', params.level);
  const q = sp.toString();
  const data = await apiService.get<TechnicalLogEntry[] | { logs: TechnicalLogEntry[] }>(
    `/admin/logs/technical${q ? `?${q}` : ''}`
  );
  return Array.isArray(data) ? data : (data as { logs: TechnicalLogEntry[] }).logs ?? [];
}
