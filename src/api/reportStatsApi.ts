import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's ReportStatsDto.cs.

export interface ReportStats {
  savedReportsCount: number;
  deterministicReportsCount: number;
  aiAssistedReportsCount: number;
  aiCreditsConsumed: number;
  creditsRemaining: number | null;
  isUnlimited: boolean;
  resetDate: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

function extractData<T>(raw: ApiResponse<T>): T {
  if (!raw.success) {
    throw new Error(raw.errors?.[0] ?? raw.message ?? 'Request failed.');
  }
  return raw.data;
}

function apiError(err: unknown, fallback: string): Error {
  const axiosErr = err as AxiosError<{ message?: string; errors?: string[] }>;
  const body = axiosErr.response?.data;
  return new Error(body?.errors?.[0] ?? body?.message ?? fallback);
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getReportStats(): Promise<ReportStats> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportStats>>('/client-portal/report-stats');
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report stats.');
  }
}
