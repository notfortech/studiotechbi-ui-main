import { API_BASE_URL } from '../../../core/constants';
import { apiService } from '../../../services/api';
import type { ApiResponse } from '../../../services/adminApiTypes';
import { unwrapApiResponse } from '../../../services/adminApiTypes';
import type {
  BlobDataSample,
  InsightsResolvedBlob,
  DataConnection,
  FileItem,
  InsightModel,
  InsightReport,
  InsightsWithTemplatesResponse,
  InsightTemplateInfo,
  OrchestratorResponse,
  VerifiedTemplateMatch,
} from '../types';

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

export function normalizeInsightModel(raw: unknown): InsightModel | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = str(o, 'id', 'modelId');
  const templateId = str(o, 'templateId', 'template_id');
  const confidence = num(o, 'confidence', 'score') ?? 0;
  const status = str(o, 'status', 'modelStatus', 'state') ?? '';
  if (!id || !templateId) return null;
  const schemaObj = asRecord(o.schema);
  const columns =
    schemaObj && Array.isArray(schemaObj.columns)
      ? (schemaObj.columns as unknown[]).filter((c): c is string => typeof c === 'string')
      : undefined;
  return {
    id,
    templateId,
    confidence,
    status,
    datasetId: str(o, 'datasetId', 'dataset_id'),
    reportId: str(o, 'reportId', 'report_id'),
    schema: columns && columns.length > 0 ? { columns } : undefined,
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

export function parseReportPayload(data: unknown): InsightReport {
  const o = asRecord(data);
  if (!o) return {};
  const nested = asRecord(o.data) ?? o;
  return {
    datasetId: str(nested, 'datasetId', 'dataset_id'),
    reportId: str(nested, 'reportId', 'report_id'),
    embedUrl: str(nested, 'embedUrl', 'embed_url'),
    accessToken: str(nested, 'accessToken', 'access_token'),
  };
}

/** OAuth redirect — backend route may differ; adjust if your API moves this. */
export function connectDataSource(type: string): void {
  const base = API_BASE_URL || '/api';
  window.location.href = `${base.replace(/\/+$/, '')}/connections/oauth/${encodeURIComponent(type)}`;
}

/**
 * OneDrive OAuth: get backend-generated auth URL then redirect.
 * Backend: GET /api/connections/oauth/onedrive-url?clientId={clientId}
 * Auth: Authorization: Bearer <JWT>
 *
 * Note: App historically stores JWT as `authToken`; requirement mentions `token`.
 * We support both to avoid breaking existing auth flows.
 */
export async function connectOneDrive(clientId: string): Promise<void> {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const base = API_BASE_URL || '/api';
  const url = `${base.replace(/\/+$/, '')}/connections/oauth/onedrive-url?clientId=${encodeURIComponent(
    clientId
  )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as unknown;
      const o = asRecord(body);
      detail =
        (o && (typeof o.message === 'string' ? o.message : '')) ||
        (o && (typeof o.error === 'string' ? o.error : '')) ||
        '';
    } catch {
      /* ignore */
    }
    const suffix = detail ? `: ${detail}` : '';
    if (res.status === 400) throw new Error(`Invalid client selection${suffix}`);
    if (res.status === 403) throw new Error(`You do not have access to this client${suffix}`);
    throw new Error(`Failed to start OneDrive OAuth (${res.status})${suffix}`);
  }

  const data = (await res.json()) as unknown;
  const o = asRecord(data);
  const redirectUrl = o && typeof o.url === 'string' ? o.url : '';
  if (!redirectUrl) {
    throw new Error('Invalid OneDrive OAuth URL response from server');
  }

  window.location.href = redirectUrl;
}

/**
 * Google Drive OAuth: get backend-generated auth URL then redirect.
 * Backend: GET /api/connections/oauth/google-url?clientId={clientId}
 * Auth: Authorization: Bearer <JWT>
 */
export async function connectGoogleDrive(clientId: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[oauth] google: requesting authorize url', { clientId });

  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (!token) {
    // eslint-disable-next-line no-console
    console.warn('[oauth] google: missing token, redirecting to login');
    window.location.href = '/login';
    return;
  }

  const base = API_BASE_URL || '/api';
  const url = `${base.replace(/\/+$/, '')}/connections/oauth/google-url?clientId=${encodeURIComponent(
    clientId
  )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    // eslint-disable-next-line no-console
    console.warn('[oauth] google: 401, redirecting to login');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('[oauth] google: failed to fetch url', { status: res.status });
    throw new Error(`Failed to start Google Drive OAuth (${res.status})`);
  }

  const data = (await res.json()) as unknown;
  const o = asRecord(data);
  const redirectUrl = o && typeof o.url === 'string' ? o.url : '';

  if (!redirectUrl) {
    // eslint-disable-next-line no-console
    console.error('[oauth] google: missing url in response', data);
    alert('Google OAuth URL was not returned by the server.');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[oauth] google: redirecting');
  window.location.href = redirectUrl;
}

export async function getConnections(clientId: string): Promise<DataConnection[]> {
  const data = await apiService.get<unknown>(
    `data-connections?clientId=${encodeURIComponent(clientId)}`
  );
  const raw = unwrapList<unknown>(data, ['items', 'connections', 'data', 'dataConnections']);
  return raw.map(normalizeConnection).filter((c): c is DataConnection => c !== null);
}

export async function removeConnection(connectionId: string): Promise<void> {
  await apiService.delete<unknown>(`data-connections/${encodeURIComponent(connectionId)}`);
}

export async function getFiles(connectionId: string): Promise<FileItem[]> {
  const data = await apiService.get<unknown>(`data-connections/${encodeURIComponent(connectionId)}/files`);
  const raw = unwrapList<unknown>(data, ['items', 'files', 'data', 'value']);
  return raw.map(normalizeFileItem).filter((f): f is FileItem => f !== null);
}

/** Triggers backend import into storage; send identifiers only. */
export async function importData(connectionId: string, path: string): Promise<unknown> {
  return apiService.post<unknown>(`data-connections/${encodeURIComponent(connectionId)}/import`, {
    path,
  });
}

function normalizeTemplateInfo(raw: unknown): InsightTemplateInfo | null {
  const o = asRecord(raw);
  if (!o) return null;
  const templateId = str(o, 'templateId', 'template_id');
  if (!templateId) return null;
  return {
    ...o,
    templateId,
    templateName: str(o, 'templateName', 'template_name', 'name', 'title'),
    industry: str(o, 'industry'),
    version: str(o, 'version'),
  } as InsightTemplateInfo;
}

function normalizeVerifiedTemplateMatch(raw: unknown): VerifiedTemplateMatch | null {
  const o = asRecord(raw);
  if (!o) return null;
  const template = normalizeTemplateInfo(o.template);
  if (!template) return null;
  const matchScore = typeof o.matchScore === 'number' ? o.matchScore : Number(o.matchScore) || 0;
  const reasonsRaw = o.matchReasons;
  const matchReasons = Array.isArray(reasonsRaw)
    ? (reasonsRaw as unknown[]).filter((r): r is string => typeof r === 'string')
    : [];
  return { template, matchScore, matchReasons };
}

/**
 * Parse insights-engine `data` payload. Tolerates missing arrays.
 * Engine payload is under `data` (use unwrapApiResponse on the HTTP body first when wrapped in ApiResponse).
 */
export function parseInsightsWithTemplatesResponse(raw: unknown): InsightsWithTemplatesResponse {
  const o = asRecord(raw);
  if (!o) {
    return { insights: {}, verifiedTemplates: [] };
  }
  const ins = asRecord(o.insights) ?? (asRecord(o.insight) as Record<string, unknown> | null);
  const insights = ins
    ? ({ ...ins, provider: str(ins, 'provider'), summary: str(ins, 'summary') } as InsightsWithTemplatesResponse['insights'])
    : {};
  const vt = o.verifiedTemplates;
  const list = Array.isArray(vt) ? vt : Array.isArray(o.verified) ? o.verified : [];
  const verifiedTemplates = list
    .map(normalizeVerifiedTemplateMatch)
    .filter((m): m is VerifiedTemplateMatch => m !== null);
  return { insights, verifiedTemplates };
}

/**
 * POST /api/insights-engine/transformations/suggest — optional body for non-blob flows.
 */
export async function suggestTransformations(body: {
  clientId: string;
  [key: string]: unknown;
}): Promise<InsightsWithTemplatesResponse> {
  const raw = await apiService.post<ApiResponse<InsightsWithTemplatesResponse> | InsightsWithTemplatesResponse>(
    'insights-engine/transformations/suggest',
    body
  );
  return parseInsightsWithTemplatesResponse(unwrapApiResponse(raw));
}

/**
 * POST /api/insights-engine/transformations/suggest-from-blob
 * Use the same `clientId` (GUID) and `path` (blobPath) as returned from `resolveBlobForReportInsights`
 * so suggestions align with the GET `report-data-sample` data.
 */
export async function suggestTransformationsFromBlob(params: {
  clientId: string;
  dataConnectionId?: string;
  path?: string;
}): Promise<InsightsWithTemplatesResponse> {
  const raw = await apiService.post<ApiResponse<InsightsWithTemplatesResponse> | InsightsWithTemplatesResponse>(
    'insights-engine/transformations/suggest-from-blob',
    {
      clientId: params.clientId,
      dataConnectionId: params.dataConnectionId,
      path: params.path,
    }
  );
  return parseInsightsWithTemplatesResponse(unwrapApiResponse(raw));
}

const BLOB_SAMPLE_MAX = 100;

function columnNameFromCell(c: unknown): string {
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'name' in c && typeof (c as { name?: unknown }).name === 'string') {
    return (c as { name: string }).name;
  }
  return String(c);
}

/** Normalize GET response for report blob sample rows. */
export function parseBlobDataSample(raw: unknown): BlobDataSample {
  const u = unwrapApiResponse(raw as ApiResponse<unknown>);
  const o = asRecord(u);
  if (!o) {
    return { columns: [], rows: [], truncated: false, rowCount: 0 };
  }
  const colsRaw = o.columns;
  let columns: string[] = [];
  if (Array.isArray(colsRaw)) {
    columns = colsRaw.map(columnNameFromCell);
  }
  const rowsRaw = o.rows;
  const allRows = Array.isArray(rowsRaw)
    ? (rowsRaw as unknown[]).filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    : [];
  const rowCount = typeof o.rowCount === 'number' ? o.rowCount : allRows.length;
  const truncated =
    o.truncated === true ||
    (typeof o.truncated === 'string' && o.truncated === 'true') ||
    allRows.length > BLOB_SAMPLE_MAX;
  const rows = allRows.slice(0, BLOB_SAMPLE_MAX);
  if (columns.length === 0 && rows.length > 0) {
    columns = Object.keys(rows[0]);
  }
  return { columns, rows, truncated, rowCount };
}

function parseResolvedBlobPayload(raw: unknown): InsightsResolvedBlob | null {
  const u = unwrapApiResponse(raw as ApiResponse<unknown>);
  const o = asRecord(u);
  if (!o) return null;
  const clientId = str(o, 'clientId', 'client_id');
  const blobPath = str(o, 'blobPath', 'blob_path', 'path', 'key');
  if (!clientId || !blobPath) return null;
  return { clientId, blobPath };
}

/**
 * GET /api/insights-engine/resolve-blob?clientCode=…
 * Resolves the blob used for the report sample and the client GUID to pass to `suggest-from-blob`.
 * (The sample GET does not return `blobPath`; this step is required until the sample DTO includes it.)
 */
export async function resolveBlobForReportInsights(params: { clientCode: string }): Promise<InsightsResolvedBlob> {
  const q = new URLSearchParams({ clientCode: params.clientCode });
  const raw = await apiService.get<ApiResponse<Record<string, unknown>> | Record<string, unknown>>(
    `insights-engine/resolve-blob?${q.toString()}`
  );
  const parsed = parseResolvedBlobPayload(raw);
  if (!parsed) {
    throw new Error('Invalid resolve-blob response: expected clientId and blobPath.');
  }
  return parsed;
}

/**
 * GET /api/insights-engine/report-data-sample?clientCode=&maxRows=100
 * Read-only sample from the active report dataset in blob. Unwrap `data` for `columns` / `rows` / `rowCount` / `truncated`.
 */
export async function getReportBlobDataSample(params: { clientCode: string; maxRows?: number }): Promise<BlobDataSample> {
  const max = Math.min(params.maxRows ?? BLOB_SAMPLE_MAX, BLOB_SAMPLE_MAX);
  const q = new URLSearchParams({
    clientCode: params.clientCode,
    maxRows: String(max),
  });
  const raw = await apiService.get<ApiResponse<BlobDataSample> | BlobDataSample>(
    `insights-engine/report-data-sample?${q.toString()}`
  );
  return parseBlobDataSample(raw);
}

export async function generateModels(clientId: string): Promise<unknown> {
  return apiService.post<unknown>('models/generate', { clientId });
}

export async function getModels(clientId: string): Promise<unknown> {
  return apiService.get<unknown>(`models/${encodeURIComponent(clientId)}`);
}

export async function listInsightModels(clientId: string): Promise<InsightModel[]> {
  const data = await getModels(clientId);
  return normalizeInsightModelsResponse(data);
}

export function normalizeInsightModelsResponse(data: unknown): InsightModel[] {
  const raw = unwrapList<unknown>(data, ['models', 'options', 'items', 'data']);
  return raw.map(normalizeInsightModel).filter((m): m is InsightModel => m !== null);
}

export async function selectModel(modelId: string, templateId: string): Promise<OrchestratorResponse> {
  const data = await apiService.post<unknown>(`models/${encodeURIComponent(modelId)}/select`, {
    templateId,
  });
  return parseOrchestratorPayload(data);
}

export async function getReport(modelId: string): Promise<InsightReport> {
  const data = await apiService.get<unknown>(`reports/${encodeURIComponent(modelId)}`);
  return parseReportPayload(data);
}
