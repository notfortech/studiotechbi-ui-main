import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

export interface BlueprintGenerateRequest {
  businessRequirement: string;
  industry?: string;
  existingSchema?: string | null;
  clientCode?: string;
  useSelectedClient?: boolean;
}

export interface BlueprintGenerateResponse {
  success: boolean;
  requestId: string;
  status: 'Completed' | 'PartiallyValid' | 'Failed';
  pdfDownloadUrl: string;
  creditsConsumed: number;
  creditsRemaining: number;
  subscriptionPlan: string;
  resetDate: string | null;
  warnings: string[];
}

export interface BlueprintCredits {
  creditsRemaining: number | null;
  creditsConsumed: number;
  subscriptionPlan: string;
  resetDate: string | null;
}

export interface BlueprintHistoryItem {
  requestId: string;
  status: string;
  businessRequirement: string;
  industry: string;
  pdfDownloadUrl: string | null;
  creditsConsumed: number | null;
  creditsRemaining: number | null;
  createdAtUtc: string;
  completedAtUtc: string | null;
}

export class BlueprintCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlueprintCreditsError';
  }
}

export async function generateBlueprint(
  body: BlueprintGenerateRequest
): Promise<BlueprintGenerateResponse> {
  try {
    const res = await apiAxiosInstance.post<BlueprintGenerateResponse>('/blueprint/generate', body);
    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    if (axiosErr.response?.status === 402) {
      throw new BlueprintCreditsError(
        axiosErr.response.data?.message ?? 'Blueprint credits exhausted.'
      );
    }
    if (axiosErr.response?.status === 400) {
      throw new Error(axiosErr.response.data?.message ?? 'Invalid request.');
    }
    if (axiosErr.response?.status === 502 || axiosErr.response?.status === 503) {
      throw new Error('Service temporarily unavailable, try again shortly.');
    }
    throw new Error(axiosErr.response?.data?.message ?? 'Blueprint generation failed.');
  }
}

export async function downloadBlueprintPdf(requestId: string): Promise<string> {
  try {
    const res = await apiAxiosInstance.get<Blob>(`/blueprint/${requestId}/pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    return URL.createObjectURL(res.data);
  } catch {
    throw new Error('PDF not available yet.');
  }
}

export async function getBlueprintCredits(
  clientCode?: string,
  useSelectedClient?: boolean
): Promise<BlueprintCredits> {
  const params = new URLSearchParams();
  if (clientCode) params.set('clientCode', clientCode);
  if (useSelectedClient) params.set('useSelectedClient', 'true');
  const res = await apiAxiosInstance.get<BlueprintCredits>(`/blueprint/credits?${params}`);
  return res.data;
}

export async function getBlueprintHistory(
  clientCode?: string,
  useSelectedClient?: boolean
): Promise<BlueprintHistoryItem[]> {
  const params = new URLSearchParams();
  if (clientCode) params.set('clientCode', clientCode);
  if (useSelectedClient) params.set('useSelectedClient', 'true');
  const res = await apiAxiosInstance.get<BlueprintHistoryItem[]>(`/blueprint/requests?${params}`);
  return res.data;
}
