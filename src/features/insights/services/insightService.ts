import { API_BASE_URL } from '../../../core/constants';
import { apiService } from '../../../services/api';
import type { DataConnection, FileItem, ModelOption, ModelOptionWithEmbed, OrchestratorResponse } from '../types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function unwrapList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  const o = asRecord(data);
  if (!o) return [];
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v as T[];
  }
  const inner = asRecord(o.data);
  if (inner) {
    for (const k of keys) {
      const v = inner[k];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

function str(o: Record<string, unknown>, ...candidates: string[]): string | undefined {
  for (const k of candidates) {
    const v = o[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function num(o: Record<string, unknown>, ...candidates: string[]): number | undefined {
  for (const k of candidates) {
    const v = o[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return undefined;
}

function normalizeConnection(raw: unknown): DataConnection | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = str(o, 'id', 'connectionId');
  const name = str(o, 'name', 'displayName', 'title') ?? 'Connection';
  const typeRaw = (str(o, 'type', 'connectionType', 'sourceType') ?? 'database').toLowerCase();
  const type =
    typeRaw === 'onedrive' || typeRaw === 'sharepoint' || typeRaw === 'database'
      ? typeRaw
      : 'database';
  if (!id) return null;
  return { id, name, type };
}

function normalizeFileItem(raw: unknown): FileItem | null {
  const o = asRecord(raw);
  if (!o) return null;
  const path = str(o, 'path', 'fullPath', 'id', 'key');
  const name = str(o, 'name', 'fileName', 'displayName') ?? path;
  if (!path) return null;
  return { path, name: name ?? path };
}

function normalizeModelOption(raw: unknown): ModelOptionWithEmbed | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = str(o, 'id', 'modelId');
  const templateId = str(o, 'templateId', 'template_id');
  const confidence = num(o, 'confidence', 'score') ?? 0;
  const schemaObj = asRecord(o.schema);
  const columns = schemaObj && Array.isArray(schemaObj.columns)
    ? (schemaObj.columns as unknown[]).filter((c): c is string => typeof c === 'string')
    : [];
  if (!id || !templateId) return null;
  const base: ModelOption = { id, templateId, confidence, schema: { columns } };
  return {
    ...base,
    reportId: str(o, 'reportId', 'report_id'),
    datasetId: str(o, 'datasetId', 'dataset_id'),
    embedUrl: str(o, 'embedUrl', 'embed_url'),
    accessToken: str(o, 'accessToken', 'access_token'),
  };
}

export function parseOrchestratorPayload(data: unknown): OrchestratorResponse {
  const o = asRecord(data);
  if (!o) return {};
  const nested = asRecord(o.data) ?? asRecord(o.result);
  const src = nested ?? o;
  return {
    datasetId: str(src, 'datasetId', 'dataset_id'),
    reportId: str(src, 'reportId', 'report_id'),
    embedUrl: str(src, 'embedUrl', 'embed_url'),
    accessToken: str(src, 'accessToken', 'access_token'),
    queued: src.queued === true || o.queued === true,
  };
}

export function connectDataSource(type: string): void {
  const base = API_BASE_URL || '/api';
  window.location.href = `${base.replace(/\/+$/, '')}/connections/oauth/${encodeURIComponent(type)}`;
}

export async function getConnections(): Promise<DataConnection[]> {
  const data = await apiService.get<unknown>('connections');
  const raw = unwrapList<unknown>(data, ['items', 'connections', 'data']);
  return raw.map(normalizeConnection).filter((c): c is DataConnection => c !== null);
}

export async function getFiles(connectionId: string): Promise<FileItem[]> {
  const data = await apiService.get<unknown>(`connections/${connectionId}/files`);
  const raw = unwrapList<unknown>(data, ['items', 'files', 'data', 'value']);
  return raw.map(normalizeFileItem).filter((f): f is FileItem => f !== null);
}

/** Triggers backend fetch into Blob; returns metadata only — never raw rows. */
export async function fetchData(connectionId: string, path: string): Promise<unknown> {
  return apiService.post<unknown>(`connections/${connectionId}/fetch`, { path });
}

export async function generateModels(clientId: string): Promise<unknown> {
  return apiService.post<unknown>('models/generate', { clientId });
}

export async function getModels(clientId: string): Promise<unknown> {
  return apiService.get<unknown>(`models/${encodeURIComponent(clientId)}`);
}

export async function selectModel(modelId: string, templateId: string): Promise<OrchestratorResponse> {
  const data = await apiService.post<unknown>(`models/${encodeURIComponent(modelId)}/select`, {
    templateId,
  });
  return parseOrchestratorPayload(data);
}

export function normalizeModelsResponse(data: unknown): ModelOptionWithEmbed[] {
  const raw = unwrapList<unknown>(data, ['models', 'options', 'items', 'data']);
  return raw.map(normalizeModelOption).filter((m): m is ModelOptionWithEmbed => m !== null);
}
