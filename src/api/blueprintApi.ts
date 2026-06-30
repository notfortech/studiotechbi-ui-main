import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

// ── V2 Request types ────────────────────────────────────────────────────────

export interface BlueprintGenerateRequest {
  tenantId: string;
  clientId: string;
  projectId?: string;
  industry: string;
  knowledgePack?: string;
  businessCapability: string;
  businessGoal: string;
  businessRequirements?: string;
  preferredProvider?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  outputFormat?: string;
}

// ── V2 Response types ───────────────────────────────────────────────────────

/** Returned by POST /blueprints/generate and GET /blueprints/generations/{id}. */
export interface BlueprintGenerationJobDto {
  generationId: string;
  blueprintId: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  confidenceScore?: number;
  warnings?: string[];
  errorMessage?: string;
  createdAt: string;
  processingStartedAt?: string;
  completedAt?: string;
  blueprintVersionId?: string;
}

/** Embedded in BlueprintDto.activeVersion. */
export interface BlueprintVersionDto {
  id: string;
  blueprintId: string;
  versionNumber: number;
  promptVersion?: string;
  confidence: number;
  generatedDate: string;
  executionTimeMs: number;
  isActive: boolean;
  hasJson: boolean;
  hasPdf: boolean;
}

/** Returned by GET /blueprints and GET /blueprints/{id}. */
export interface BlueprintDto {
  id: string;
  tenantId: string;
  clientId: string;
  projectId?: string;
  industry: string;
  knowledgePack?: string;
  status: 'Active' | 'Archived';
  versionCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  activeVersion?: BlueprintVersionDto;
}

// ── API functions ────────────────────────────────────────────────────────────

export async function generateBlueprint(
  req: BlueprintGenerateRequest
): Promise<BlueprintGenerationJobDto> {
  try {
    const res = await apiAxiosInstance.post<BlueprintGenerationJobDto>('/blueprints/generate', req);
    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    if (axiosErr.response?.status === 400) {
      throw new Error(axiosErr.response.data?.message ?? 'Invalid request.');
    }
    if (axiosErr.response?.status === 502 || axiosErr.response?.status === 503) {
      throw new Error('Service temporarily unavailable, try again shortly.');
    }
    throw new Error(axiosErr.response?.data?.message ?? 'Blueprint generation failed.');
  }
}

export async function getGenerationStatus(
  generationId: string
): Promise<BlueprintGenerationJobDto> {
  const res = await apiAxiosInstance.get<BlueprintGenerationJobDto>(
    `/blueprints/generations/${generationId}`
  );
  return res.data;
}

export async function listBlueprints(
  tenantId: string,
  clientId?: string
): Promise<BlueprintDto[]> {
  const params = new URLSearchParams({ tenantId });
  if (clientId) params.set('clientId', clientId);
  const res = await apiAxiosInstance.get<unknown>(`/blueprints?${params}`);
  const raw = res.data;
  if (Array.isArray(raw)) return raw as BlueprintDto[];
  // Handle paginated envelope shapes
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items as BlueprintDto[];
  if (Array.isArray(obj.data)) return obj.data as BlueprintDto[];
  return [];
}

export async function downloadBlueprintPdf(blueprintId: string): Promise<void> {
  const res = await apiAxiosInstance.get<Blob>(`/blueprints/${blueprintId}/pdf`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blueprint-${blueprintId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadBlueprintJson(blueprintId: string): Promise<string> {
  const res = await apiAxiosInstance.get<string>(`/blueprints/${blueprintId}/json`, {
    responseType: 'text',
    headers: { Accept: 'application/json' },
  });
  return res.data;
}

export async function deleteBlueprint(blueprintId: string): Promise<void> {
  await apiAxiosInstance.delete(`/blueprints/${blueprintId}`);
}
