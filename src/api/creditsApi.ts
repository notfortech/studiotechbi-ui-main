import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

// Reads the tenant's real AI credit balance — the same shared ledger that gates both
// Blueprint generation and AI-assisted report generation. Falls back to an "unknown"
// balance shape rather than throwing, since a credit widget failing to load shouldn't
// block the rest of the page.

export interface CreditBalance {
  creditsRemaining: number | null;
  isUnlimited: boolean;
  subscriptionPlan: string | null;
  resetDate: string | null;
  message: string | null;
}

export async function getCreditBalance(): Promise<CreditBalance> {
  try {
    const res = await apiAxiosInstance.get<CreditBalance>('/blueprint/credits');
    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    throw new Error(axiosErr.message || 'Failed to load credit balance.');
  }
}
