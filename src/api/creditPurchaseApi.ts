import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's CreditPurchaseRequestDtos.cs.

export interface CreditPack {
  credits: number;
  label: string;
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

/** Mock checkout — no real payment gateway. Files a request an admin fulfils manually once
 * payment is confirmed out of band (see AdminCreditPurchaseRequestsController.MarkPaidAsync). */
export async function requestCreditPurchase(
  creditsRequested: number,
  packLabel: string,
  notes?: string
): Promise<{ requestId: string }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ requestId: string }>>(
      '/credit-purchase-requests',
      { creditsRequested, packLabel, notes }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to submit the credit purchase request.');
  }
}
