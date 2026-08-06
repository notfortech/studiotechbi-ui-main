import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { ExtractedSchemaDto } from './reportDesignerApi';

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

/** Distinguishes why a ticket was filed — "we searched and found nothing confident" vs. "the
 * AI/network call itself failed" — mirrors koru-main's CustomReportRequestReasons. Omitted
 * defaults to NoConfidentMatch server-side. */
export type CustomReportRequestReason = 'NoConfidentMatch' | 'GenerationError';

/** Files a "request a custom Power BI report" ticket — sends the already-extracted schema
 * (no re-upload of the source file) so an analyst can see what they're building against. */
export async function requestCustomPowerBiReport(
  schema: ExtractedSchemaDto,
  notes?: string,
  reason?: CustomReportRequestReason
): Promise<{ requestId: string }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ requestId: string }>>(
      '/report-requests',
      { schema, notes, reason }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to file the custom report request.');
  }
}
