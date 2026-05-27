import { isAxiosError } from 'axios';
import { API_BASE_URL } from '../../../core/constants';
import { apiService } from '../../../services/api';
import type { ApiResponse } from '../../../services/adminApiTypes';
import { unwrapApiResponse } from '../../../services/adminApiTypes';
import type {
  BlobDataSample,
  InsightsResolvedBlob,
  CanonicalPlansResponse,
  DashboardTemplatePlan,
  ModelsSuggestFromBlobResponse,
  ProposedModel,
  DataConnection,
  FileItem,
  InsightModel,
  InsightReport,
  InsightsWithTemplatesResponse,
  InsightTemplateInfo,
  OrchestratorResponse,
  VerifiedTemplateMatch,
} from '../types';

export interface UploadAccountingCreatedResponse {
  success: boolean;
  clientCode: string;
  blobPath: string;
  fileName: string;
  uploadedAtUtc: string;
}

export interface CreateReportRequestResponse {
  success: boolean;
  requestId: string;
  status: string;
}

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

/** Template rows from match-only endpoints: `{ templateId, name, confidence, mappingPreview }`. */
function normalizeFlatTemplateMatch(raw: unknown): VerifiedTemplateMatch | null {
  const o = asRecord(raw);
  if (!o) return null;
  if (o.template && typeof o.template === 'object') return null;
  const templateId = str(o, 'templateId', 'template_id', 'id');
  if (!templateId) return null;
  const name = str(o, 'name', 'templateName', 'title');
  let matchScore = typeof o.matchScore === 'number' ? o.matchScore : Number(o.matchScore);
  if (Number.isNaN(matchScore)) {
    const conf = num(o, 'confidence', 'score');
    if (conf == null) matchScore = 0;
    else matchScore = conf > 1 ? Math.min(1, conf / 100) : conf;
  } else if (matchScore > 1) {
    matchScore = Math.min(1, matchScore / 100);
  }
  const matchReasons: string[] = [];
  const mp = o.mappingPreview;
  if (typeof mp === 'string' && mp.trim()) matchReasons.push(mp.trim());
  else if (Array.isArray(mp)) {
    for (const x of mp) {
      if (typeof x === 'string' && x.trim()) matchReasons.push(x.trim());
    }
  }
  const template: InsightTemplateInfo = {
    templateId,
    templateName: name,
    industry: str(o, 'industry'),
    version: str(o, 'version'),
  };
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

function normalizeProposedModel(raw: unknown): ProposedModel | null {
  const o = asRecord(raw);
  if (!o) return null;
  const schemaObj = asRecord(o.schema);
  const cols =
    schemaObj && Array.isArray(schemaObj.columns)
      ? (schemaObj.columns as unknown[]).filter((c): c is string => typeof c === 'string')
      : undefined;
  return {
    ...o,
    id: str(o, 'id', 'modelId'),
    name: str(o, 'name', 'title', 'modelName'),
    description: str(o, 'description', 'summary'),
    confidence: num(o, 'confidence', 'score'),
    templateId: str(o, 'templateId', 'template_id'),
    columns: Array.isArray(o.columns)
      ? (o.columns as unknown[]).filter((c): c is string => typeof c === 'string')
      : cols,
  } as ProposedModel;
}

export function parseModelsSuggestFromBlobResponse(raw: unknown): ModelsSuggestFromBlobResponse {
  const u = unwrapApiResponse(raw as ApiResponse<unknown>);
  const o = asRecord(u);
  if (!o) return { proposedModels: [], verifiedTemplates: [] };
  const ins = asRecord(o.insights) ?? asRecord(o.insight);
  const insights = ins
    ? ({
        ...ins,
        provider: str(ins, 'provider'),
        summary: str(ins, 'summary'),
      } as ModelsSuggestFromBlobResponse['insights'])
    : undefined;
  const pmRaw = unwrapList<unknown>(u, ['proposedModels', 'models', 'items', 'options']);
  const proposedModels = pmRaw.map(normalizeProposedModel).filter((m): m is ProposedModel => m !== null);
  const vtRaw = unwrapList<unknown>(u, ['verifiedTemplates', 'templates']);
  const verifiedTemplates = vtRaw
    .map((item) => normalizeVerifiedTemplateMatch(item) ?? normalizeFlatTemplateMatch(item))
    .filter((m): m is VerifiedTemplateMatch => m !== null);
  return { proposedModels, verifiedTemplates, insights };
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
 * Backend requires `BlobPath` (JSON: `blobPath`). `path` is also sent for compatibility.
 */
export async function suggestTransformationsFromBlob(params: {
  clientId: string;
  dataConnectionId?: string;
  path?: string;
  /** Match Reports when an accountant (or client in firm mode) is acting for a selected client. */
  useSelectedClient?: boolean;
}): Promise<InsightsWithTemplatesResponse> {
  const body: Record<string, unknown> = {
    clientId: params.clientId,
  };
  if (params.dataConnectionId) {
    body.dataConnectionId = params.dataConnectionId;
  }
  if (params.path) {
    body.blobPath = params.path;
    body.path = params.path;
  }
  if (params.useSelectedClient) {
    body.useSelectedClient = true;
  }
  const raw = await apiService.post<ApiResponse<InsightsWithTemplatesResponse> | InsightsWithTemplatesResponse>(
    'insights-engine/transformations/suggest-from-blob',
    body
  );
  return parseInsightsWithTemplatesResponse(unwrapApiResponse(raw));
}

/**
 * POST /api/insights-engine/models/suggest-from-blob
 * Returns proposed dashboard models + verified template matches.
 */
export async function suggestModelsFromBlob(params: {
  clientId: string;
  blobPath: string;
  useSelectedClient?: boolean;
}): Promise<ModelsSuggestFromBlobResponse> {
  const body: Record<string, unknown> = {
    clientId: params.clientId,
    blobPath: params.blobPath,
  };
  if (params.useSelectedClient) body.useSelectedClient = true;
  const raw = await apiService.post<ApiResponse<ModelsSuggestFromBlobResponse> | ModelsSuggestFromBlobResponse>(
    'insights-engine/models/suggest-from-blob',
    body
  );
  const env = isApiEnvelopeFailure(raw);
  if (env.failed) throw new Error(env.message);
  return parseModelsSuggestFromBlobResponse(raw);
}

/**
 * POST /api/insights-engine/templates/match-from-blob
 * Lightweight, deterministic template matching (optional AI refinement is server-controlled).
 * Returns list shaped like VerifiedTemplateMatch for use in Copilot.
 */
export async function matchTemplatesFromBlob(params: {
  clientCode: string;
  blobPath: string;
  maxRows?: number;
  useSelectedClient?: boolean;
}): Promise<VerifiedTemplateMatch[]> {
  const body: Record<string, unknown> = {
    clientCode: params.clientCode,
    blobPath: params.blobPath,
    maxRows: typeof params.maxRows === 'number' ? params.maxRows : 100,
  };
  if (params.useSelectedClient) body.useSelectedClient = true;

  const raw = await apiService.post<unknown>('insights-engine/templates/match-from-blob', body);
  const env = isApiEnvelopeFailure(raw);
  if (env.failed) throw new Error(env.message);
  const u = unwrapApiResponse(raw as ApiResponse<unknown>);
  const list = unwrapList<unknown>(u, ['templates', 'verifiedTemplates', 'items', 'options']);
  return list.map(normalizeFlatTemplateMatch).filter((m): m is VerifiedTemplateMatch => m !== null);
}

const BLOB_SAMPLE_MAX = 100;

function columnNameFromCell(c: unknown): string {
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'name' in c && typeof (c as { name?: unknown }).name === 'string') {
    return (c as { name: string }).name;
  }
  return String(c);
}

function digTablePayload(o: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!o) return null;
  if (Array.isArray(o.rows)) return o;
  const dataInner = asRecord(o.data);
  if (dataInner && Array.isArray(dataInner.rows)) return dataInner;
  const resInner = asRecord(o.result);
  if (resInner && Array.isArray(resInner.rows)) return resInner;
  const tbl = asRecord(o.table);
  if (tbl && Array.isArray(tbl.rows)) return tbl;
  return o;
}

/** Normalize GET response for report blob sample rows. Tolerates nested `data` / `result` / `table` and alternate row keys. */
export function parseBlobDataSample(raw: unknown): BlobDataSample {
  const u0 = unwrapApiResponse(raw as ApiResponse<unknown>);
  const o0 = asRecord(u0);
  const o = digTablePayload(o0) ?? o0;
  if (!o) {
    return { columns: [], rows: [], truncated: false, rowCount: 0 };
  }
  const colsRaw = o.columns ?? o.columnNames;
  let columns: string[] = [];
  if (Array.isArray(colsRaw)) {
    columns = colsRaw.map(columnNameFromCell);
  }
  const rowsRaw = o.rows ?? o.items ?? o.records ?? o.values;
  let allRows: Record<string, unknown>[] = Array.isArray(rowsRaw)
    ? (rowsRaw as unknown[]).filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    : [];
  if (allRows.length === 0 && Array.isArray((o as { value?: unknown }).value)) {
    const v = (o as { value: unknown[] }).value;
    allRows = v
      .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
      .map((r) => r as Record<string, unknown>);
  }
  const rowCount = typeof o.rowCount === 'number' ? o.rowCount : typeof o.totalCount === 'number' ? o.totalCount : allRows.length;
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

function isApiEnvelopeFailure(raw: unknown): { failed: true; message: string } | { failed: false } {
  const o = asRecord(raw);
  if (!o) return { failed: false };
  if (o.success === false) {
    const errList = o.errors;
    const fromErrors =
      Array.isArray(errList) && typeof errList[0] === 'string' && errList[0] ? (errList[0] as string) : null;
    const message =
      fromErrors ||
      (typeof o.message === 'string' && o.message) ||
      (typeof o.error === 'string' && o.error) ||
      'The server returned success: false for the sample request.';
    return { failed: true, message };
  }
  return { failed: false };
}

/** For axios/HTTP and envelope failures; use in the hook when a sample call rejects. */
export function formatInsightsApiError(e: unknown): string {
  if (isAxiosError(e)) {
    const st = e.response?.status;
    const data = e.response?.data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const errList = d.errors;
      const firstErr =
        Array.isArray(errList) && typeof errList[0] === 'string' && errList[0] ? (errList[0] as string) : null;
      const m =
        firstErr ||
        (typeof d.message === 'string' && d.message) ||
        (typeof d.error === 'string' && d.error) ||
        (typeof d.title === 'string' && d.title);
      if (m) return m;
    }
    if (st === 405) {
      return 'HTTP 405: method not allowed. This route may be implemented as POST with a JSON body, not GET (query-only).';
    }
    if (st === 404) {
      return 'Sample API not found (404). Confirm /api/insights-engine/report-data-sample is deployed and the path matches.';
    }
    if (st === 401) {
      return 'Unauthorized (401). Sign in again or check that this user can read report data for this client.';
    }
    if (st === 403) {
      return 'Forbidden (403). This account may not read blob samples for this clientCode.';
    }
    if (st === 404) {
      return 'No blob found under accounting/created (404).';
    }
    if (st === 502 || st === 503) {
      return 'AI service unavailable. Please try again later.';
    }
    return e.message || `Request failed${st ? ` (${st})` : ''}.`;
  }
  if (e instanceof Error) return e.message;
  return 'Could not load the data sample.';
}

/**
 * Canonical plans (single POST only).
 * POST /api/insights-engine/plans/generate-from-blob
 */
export async function generateCanonicalPlansFromBlob(args: {
  clientCode: string;
  blobPath?: string;
  maxRows?: number;
  userPrompt: string;
  useSelectedClient?: boolean;
  mode?: 'PredictScenarios' | 'ScenarioFocused';
}): Promise<CanonicalPlansResponse> {
  const body: Record<string, unknown> = {
    clientCode: args.clientCode,
    blobPath: args.blobPath ?? '',
    maxRows: typeof args.maxRows === 'number' ? args.maxRows : 100,
    userPrompt: args.userPrompt,
    mode: args.mode ?? 'PredictScenarios',
    useSelectedClient: args.useSelectedClient === true,
  };
  const raw = await apiService.post<ApiResponse<CanonicalPlansResponse> | CanonicalPlansResponse>(
    'insights-engine/plans/generate-from-blob',
    body
  );
  const env = isApiEnvelopeFailure(raw);
  if (env.failed) throw new Error(env.message);
  const data = unwrapApiResponse(raw) as CanonicalPlansResponse;
  const plans = Array.isArray((data as { plans?: unknown }).plans) ? ((data as { plans: DashboardTemplatePlan[] }).plans) : [];
  return { ...data, plans };
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
 * POST /api/insights-engine/resolve-blob (JSON body).
 * Do not call GET on this path — the server may only expose POST; a GET fallback can return 500 "method not supported".
 */
export async function resolveBlobForReportInsights(params: {
  clientCode: string;
  useSelectedClient?: boolean;
}): Promise<InsightsResolvedBlob> {
  const body: Record<string, unknown> = { clientCode: params.clientCode };
  if (params.useSelectedClient) {
    body.useSelectedClient = true;
  }
  const raw = await apiService.post<ApiResponse<Record<string, unknown>> | Record<string, unknown>>(
    'insights-engine/resolve-blob',
    body
  );
  const parsed = parseResolvedBlobPayload(raw);
  if (!parsed) {
    throw new Error('Invalid resolve-blob response: expected clientId and blobPath.');
  }
  return parsed;
}

/**
 * POST /api/client-portal/uploads/accounting-created (multipart/form-data).
 * Uploads a CSV/XLSX into {client}/accounting/created/ so Insights can pick it up.
 */
export async function uploadAccountingCreatedFile(args: {
  file: File;
  clientCode?: string;
  useSelectedClient?: boolean;
}): Promise<UploadAccountingCreatedResponse> {
  const form = new FormData();
  form.set('file', args.file);
  if (args.clientCode) form.set('clientCode', args.clientCode);
  if (args.useSelectedClient) form.set('useSelectedClient', 'true');

  const raw = await apiService.post<UploadAccountingCreatedResponse>(
    'client-portal/uploads/accounting-created',
    form,
    {
      // Override the ApiService default JSON content-type for multipart.
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  const o = asRecord(raw);
  if (!o) throw new Error('Upload failed: invalid response from server.');
  const success = o.success === true;
  const clientCode = str(o, 'clientCode') ?? '';
  const blobPath = str(o, 'blobPath') ?? '';
  const fileName = str(o, 'fileName') ?? '';
  const uploadedAtUtc = str(o, 'uploadedAtUtc') ?? '';
  if (!success || !blobPath) throw new Error('Upload failed.');
  return { success, clientCode, blobPath, fileName, uploadedAtUtc };
}

/**
 * GET /api/templates/{templateId}/design-image
 * Returns a browser object URL for the image. Caller should revokeObjectURL when done.
 */
export async function getTemplateDesignImageObjectUrl(templateId: string): Promise<string> {
  if (!templateId) throw new Error('templateId is required.');
  // apiService.get returns response.data; with axios responseType=blob that will be a Blob
  const blob = (await apiService.get<Blob>(`templates/${encodeURIComponent(templateId)}/design-image`, {
    responseType: 'blob',
  })) as unknown as Blob;
  if (!blob || typeof (blob as Blob).size !== 'number') {
    throw new Error('Invalid image response.');
  }
  return URL.createObjectURL(blob);
}

/**
 * POST /api/reports/requests
 * Create a pending report request when the user confirms a template design.
 */
export async function createReportRequest(args: {
  templateId: string;
  blobPath?: string;
  clientCode?: string;
  useSelectedClient?: boolean;
}): Promise<CreateReportRequestResponse> {
  const body: Record<string, unknown> = {
    templateId: args.templateId,
    blobPath: args.blobPath,
    clientCode: args.clientCode,
    useSelectedClient: args.useSelectedClient === true,
  };
  const raw = await apiService.post<unknown>('reports/requests', body);
  const o = asRecord(raw);
  if (!o) throw new Error('Invalid response from server.');
  const success = o.success === true;
  const requestId = str(o, 'requestId') ?? '';
  const status = str(o, 'status') ?? '';
  if (!success || !requestId) throw new Error('Request failed.');
  return { success, requestId, status };
}

/**
 * POST /api/insights-engine/report-data-sample (JSON: clientCode, maxRows, useSelectedClient?).
 * Do not fall back to GET — GET on this path has produced 500 "Specified method is not supported" on some hosts.
 */
export async function getReportBlobDataSample(params: {
  clientCode: string;
  maxRows?: number;
  useSelectedClient?: boolean;
}): Promise<BlobDataSample> {
  const max = Math.min(params.maxRows ?? BLOB_SAMPLE_MAX, BLOB_SAMPLE_MAX);
  const body: Record<string, unknown> = {
    clientCode: params.clientCode,
    maxRows: max,
  };
  if (params.useSelectedClient) {
    body.useSelectedClient = true;
  }
  const raw = await apiService.post<ApiResponse<BlobDataSample> | BlobDataSample>(
    'insights-engine/report-data-sample',
    body
  );
  const env = isApiEnvelopeFailure(raw);
  if (env.failed) {
    throw new Error(env.message);
  }
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
