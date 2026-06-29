import { apiAxiosInstance } from './apiClient';
import { apiService } from './api';
import { unwrapApiResponse, unwrapPaginated, type PaginatedResult } from './adminApiTypes';

// ── Monthly usage tracking (localStorage) ─────────────────────────────────

const BLUEPRINT_USAGE_KEY = 'blueprintUsage';

interface BlueprintUsageRecord { month: string; count: number; }

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getBlueprintUsageThisMonth(clientCode: string): number {
  try {
    const raw = localStorage.getItem(`${BLUEPRINT_USAGE_KEY}_${clientCode}`);
    if (!raw) return 0;
    const rec: BlueprintUsageRecord = JSON.parse(raw);
    return rec.month === getCurrentMonth() ? rec.count : 0;
  } catch { return 0; }
}

export function incrementBlueprintUsage(clientCode: string): void {
  const current = getBlueprintUsageThisMonth(clientCode);
  const rec: BlueprintUsageRecord = { month: getCurrentMonth(), count: current + 1 };
  localStorage.setItem(`${BLUEPRINT_USAGE_KEY}_${clientCode}`, JSON.stringify(rec));
}

export function getNextResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('default', { month: 'long', day: 'numeric' });
}

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
