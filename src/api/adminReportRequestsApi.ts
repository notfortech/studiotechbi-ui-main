import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { ExtractedSchemaDto } from './reportDesignerApi';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's CustomReportRequestDtos.cs / AdminReportRequestsController.

export type CustomReportRequestStatus = 'Pending' | 'InProgress' | 'Fulfilled' | 'Declined';

export interface CustomReportRequestSummary {
  requestId: string;
  status: CustomReportRequestStatus;
  requestedByEmail?: string | null;
  sourceFileName?: string | null;
  createdAt: string;
  fulfilledAtUtc?: string | null;
  exportedToBlobAtUtc?: string | null;
}

export interface CustomReportRequestDetail {
  requestId: string;
  clientId: string;
  status: CustomReportRequestStatus;
  requestedByEmail?: string | null;
  notes?: string | null;
  schema?: ExtractedSchemaDto | null;
  sourceFileName?: string | null;
  createdAt: string;
  fulfilledSavedReportId?: string | null;
  fulfilledAtUtc?: string | null;
  fulfilledByEmail?: string | null;
  blobPath?: string | null;
  exportedToBlobAtUtc?: string | null;
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

export async function listReportRequests(limit?: number): Promise<CustomReportRequestSummary[]> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<CustomReportRequestSummary[]>>(
      '/admin/report-requests',
      limit ? { params: { limit } } : undefined
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report requests.');
  }
}

export async function getReportRequest(requestId: string): Promise<CustomReportRequestDetail> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<CustomReportRequestDetail>>(
      `/admin/report-requests/${requestId}`
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report request.');
  }
}

/** Records the analyst-built PowerBiAsset and links it to this request — the same action creates
 * the client-visible SavedReport row (source PowerBiRequestFulfilled) server-side. */
export async function fulfillReportRequest(
  requestId: string,
  powerBiAssetId: string
): Promise<{ savedReportId: string }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ savedReportId: string }>>(
      `/admin/report-requests/${requestId}/fulfill`,
      { powerBiAssetId }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to mark this request fulfilled.');
  }
}

/** Writes this request's schema snapshot to blob storage on demand -- the hand-off point for
 * feeding a no-template-match data shape into the template-generating agent. Safe to call again
 * on an already-exported request; it just overwrites the same blob path. */
export async function exportReportRequestToBlob(
  requestId: string
): Promise<{ blobPath: string; exportedToBlobAtUtc: string }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ blobPath: string; exportedToBlobAtUtc: string }>>(
      `/admin/report-requests/${requestId}/export-to-blob`
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to export this request to blob storage.');
  }
}
