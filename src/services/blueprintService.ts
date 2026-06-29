import { apiAxiosInstance } from './apiClient';
import { apiService } from './api';
import { unwrapApiResponse, unwrapPaginated, type PaginatedResult } from './adminApiTypes';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SourceSystemDto {
  name: string;
  type?: string;
  description?: string;
  tables?: string[];
}

export interface ColumnMetadataDto {
  name: string;
  dataType?: string;
  description?: string;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
}

export interface DatasetMetadataDto {
  name: string;
  description?: string;
  columns?: ColumnMetadataDto[];
}

export interface GenerateBlueprintRequest {
  tenantId: string;
  clientId: string;
  projectId?: string;
  industry: string;
  knowledgePack?: string;
  businessCapability: string;
  businessGoal: string;
  businessRequirements?: string;
  sourceSystems?: SourceSystemDto[];
  datasetMetadata?: DatasetMetadataDto[];
  preferredProvider?: string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  outputFormat?: string;
}

export interface BlueprintGenerationJobDto {
  generationId: string;
  blueprintId: string;
  requestId: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  confidenceScore?: number;
  warnings?: string[];
  errorMessage?: string;
  createdAt: string;
  processingStartedAt?: string;
  completedAt?: string;
  blueprintVersionId?: string;
}

export interface BlueprintVersionDto {
  id: string;
  versionNumber: number;
  promptVersion?: string;
  confidence: number;
  generatedDate: string;
  executionTimeMs: number;
  hasJson: boolean;
  hasPdf: boolean;
}

export interface BlueprintDto {
  id: string;
  tenantId: string;
  clientId: string;
  projectId?: string;
  industry: string;
  knowledgePack?: string;
  status: string;
  versionCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  activeVersion?: BlueprintVersionDto;
}

// ── Service functions ──────────────────────────────────────────────────────

export async function generateBlueprint(req: GenerateBlueprintRequest): Promise<BlueprintGenerationJobDto> {
  const raw = await apiService.post<unknown>('/blueprints/generate', req);
  return unwrapApiResponse<BlueprintGenerationJobDto>(raw as never);
}

export async function getGenerationStatus(generationId: string): Promise<BlueprintGenerationJobDto> {
  const raw = await apiService.get<unknown>(`/blueprints/generations/${generationId}`);
  return unwrapApiResponse<BlueprintGenerationJobDto>(raw as never);
}

export async function listBlueprints(
  tenantId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<BlueprintDto>> {
  const raw = await apiService.get<unknown>(
    `/blueprints?tenantId=${encodeURIComponent(tenantId)}&page=${page}&pageSize=${pageSize}`
  );
  return unwrapPaginated<BlueprintDto>(raw);
}

export async function getBlueprintById(id: string): Promise<BlueprintDto> {
  const raw = await apiService.get<unknown>(`/blueprints/${id}`);
  return unwrapApiResponse<BlueprintDto>(raw as never);
}

export async function downloadBlueprintJson(blueprintId: string): Promise<string> {
  const response = await apiAxiosInstance.get<string>(`/blueprints/${blueprintId}/json`, {
    responseType: 'text',
    headers: { Accept: 'application/json' },
  });
  return response.data;
}

export async function downloadBlueprintPdf(blueprintId: string): Promise<void> {
  const response = await apiAxiosInstance.get<Blob>(`/blueprints/${blueprintId}/pdf`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blueprint-${blueprintId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function deleteBlueprint(id: string): Promise<void> {
  await apiService.delete(`/blueprints/${id}`);
}
