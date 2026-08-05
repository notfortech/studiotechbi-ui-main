import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's CreditPurchaseRequestDtos.cs / AdminCreditPurchaseRequestsController.

export type CreditPurchaseRequestStatus = 'Pending' | 'Paid' | 'Cancelled';
export type CreditPurchaseRequestSource = 'Client' | 'System';

export interface CreditPurchaseRequestSummary {
  requestId: string;
  status: CreditPurchaseRequestStatus;
  creditsRequested: number;
  packLabel: string;
  createdAt: string;
  paidAtUtc?: string | null;
  source: CreditPurchaseRequestSource;
}

export interface CreditPurchaseRequestDetail {
  requestId: string;
  clientId: string;
  status: CreditPurchaseRequestStatus;
  requestedByEmail?: string | null;
  creditsRequested: number;
  packLabel: string;
  notes?: string | null;
  createdAt: string;
  paidAtUtc?: string | null;
  paidByEmail?: string | null;
  source: CreditPurchaseRequestSource;
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

export async function listCreditPurchaseRequests(limit?: number): Promise<CreditPurchaseRequestSummary[]> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<CreditPurchaseRequestSummary[]>>(
      '/admin/credit-purchase-requests',
      limit ? { params: { limit } } : undefined
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load credit purchase requests.');
  }
}

export async function getCreditPurchaseRequest(requestId: string): Promise<CreditPurchaseRequestDetail> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<CreditPurchaseRequestDetail>>(
      `/admin/credit-purchase-requests/${requestId}`
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load credit purchase request.');
  }
}

/** Grants the requested credits against the AI credit ledger, then marks the ticket Paid. */
export async function markCreditPurchaseRequestPaid(
  requestId: string,
  notes?: string
): Promise<{ creditsGranted: number; creditsRemaining: number | null }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ creditsGranted: number; creditsRemaining: number | null }>>(
      `/admin/credit-purchase-requests/${requestId}/mark-paid`,
      { notes }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to mark this request paid.');
  }
}
