import { apiAxiosInstance, AI_MATCH_TIMEOUT_MS } from '../services/apiClient';
import axios, { AxiosError } from 'axios';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  maxLength?: number;
}

export interface TableInfo {
  tableName: string;
  sheetName?: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ExtractedSchemaDto {
  source: 'excel' | 'sql' | 'sharepoint';
  fileName: string;
  tables: TableInfo[];
  schemaHash: string;
  extractedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
}

export interface SchemaRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface StarSchema {
  factTable: string;
  dimensionTables: string[];
  relationships: SchemaRelationship[];
}

export interface TemplateOption {
  themeId: string;
  themeName: string;
  score: number;
}

export interface GenerateReportModelResponse {
  // Both are best-effort: starSchema needs a fact table in the blueprint's data_model,
  // templates needs stbi_transformers's /designs step to succeed. Neither is guaranteed.
  starSchema?: StarSchema;
  templates?: TemplateOption[];
  correlationId: string;
  durationMs: number;
  // Raw blueprint JSON from stbi_transformers — opaque on the frontend, held only to be
  // sent back unmodified to POST /report-designer/publish. Never rendered or inspected here.
  blueprint?: unknown;
}

export interface PublishReportResponse {
  correlationId: string;
  workspaceId: string;
  workspaceName: string;
  datasetId: string;
  datasetName: string;
  datasetCreated: boolean;
  tmdlFileCount: number;
  deploySteps: string[];
}

export interface ConsentDecisionResponse {
  granted: boolean;
  schemaHash: string;
  decidedAt: string;
}

export interface ReportMatchColumnMapping {
  fieldName: string;
  dataType: string;
  isRequired: boolean;
  clientColumnName?: string | null;
  included: boolean;
}

export interface ReportMatchCandidateTemplate {
  templateId: string;
  templateName: string;
  isPublishReady: boolean;
}

export type ReportMatchSource = 'Deterministic' | 'AiMatched' | 'AiProposedNew';

export interface ReportMatchResult {
  draftId: string;
  schemaModelId?: string | null;
  schemaModelName?: string | null;
  industry?: string | null;
  confidence: number;
  matchSource: ReportMatchSource;
  pendingSupportReview: boolean;
  candidateTemplates: ReportMatchCandidateTemplate[];
  columnMappings: ReportMatchColumnMapping[];
}

export interface DataUsageConsentResult {
  draftId: string;
  approvedAt: string;
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

/** True for a client-side timeout (AI_MATCH_TIMEOUT_MS elapsed) or a caller-triggered abort. */
function isTimeoutOrAbort(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED';
}

const AI_TIMEOUT_MESSAGE =
  "The AI matching service didn't respond in time. Your request may still be processing — " +
  'try again in a minute, or continue without AI matching.';

const AI_CANCELLED_MESSAGE = 'Cancelled.';

/** Distinct, honest error for the AI-backed calls instead of axios's generic timeout/cancel text. */
function aiCallError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') {
    return new Error(AI_CANCELLED_MESSAGE);
  }
  if (isTimeoutOrAbort(err)) {
    return new Error(AI_TIMEOUT_MESSAGE);
  }
  return err instanceof Error ? err : apiError(err, fallback);
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function extractSchemaFromExcel(file: File): Promise<ExtractedSchemaDto> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await apiAxiosInstance.post<ApiResponse<ExtractedSchemaDto>>(
      '/report-designer/extract-schema/excel',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to extract schema from Excel.');
  }
}

export async function extractSchemaFromSql(params: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}): Promise<ExtractedSchemaDto> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ExtractedSchemaDto>>(
      '/report-designer/extract-schema/sql',
      params
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to connect to SQL Server.');
  }
}

export async function browseSharePoint(siteUrl: string): Promise<FileItem[]> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<FileItem[]>>(
      '/report-designer/sharepoint/browse',
      { siteUrl }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to browse SharePoint site.');
  }
}

export async function extractSchemaFromSharePoint(params: {
  siteUrl: string;
  driveItemId: string;
  fileName: string;
}): Promise<ExtractedSchemaDto> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ExtractedSchemaDto>>(
      '/report-designer/extract-schema/sharepoint',
      params
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to extract schema from SharePoint file.');
  }
}

/**
 * Records (or declines) consent to send this schema's column names/types — never
 * row data — to the Report Designer AI. Must be called with granted=true before
 * generateReportModel will succeed for the same clientId + schema.
 */
export async function recordAiConsent(
  clientId: string,
  schemaHash: string,
  granted: boolean
): Promise<ConsentDecisionResponse> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ConsentDecisionResponse>>(
      '/report-designer/consent',
      { clientId, schemaHash, consentGranted: granted }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to record consent decision.');
  }
}

/**
 * Scores the extracted schema against the reference SchemaModel library (deterministic
 * name-overlap first, escalating to AI semantic matching below a confidence gate) and
 * persists the result as a ReportMatchDraft. Requires prior consent, same as generateReportModel.
 *
 * Bounded by AI_MATCH_TIMEOUT_MS and cancellable via `signal` — the deterministic path is
 * fast, but an AI-escalated match can take up to koru-main's own ~330s outbound budget.
 */
export async function matchSchemaModel(
  clientId: string,
  schema: ExtractedSchemaDto,
  signal?: AbortSignal
): Promise<ReportMatchResult> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ReportMatchResult>>(
      '/report-designer/match',
      { clientId, schema },
      { timeout: AI_MATCH_TIMEOUT_MS, signal }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to match schema against the model directory.');
  }
}

/**
 * Consent #2 — confirms the report will use this specific (matched) data. Distinct from
 * the AI-matching consent recorded by recordAiConsent. Append-only: safe to call again.
 */
export async function recordDataUsageConsent(
  draftId: string,
  clientId: string
): Promise<DataUsageConsentResult> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<DataUsageConsentResult>>(
      `/report-designer/match/${draftId}/data-usage-consent`,
      { clientId }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to record data usage consent.');
  }
}

/**
 * Bounded by AI_MATCH_TIMEOUT_MS and cancellable via `signal` — see matchSchemaModel.
 */
export async function generateReportModel(
  clientId: string,
  schema: ExtractedSchemaDto,
  preferredTheme?: string,
  signal?: AbortSignal
): Promise<GenerateReportModelResponse> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<GenerateReportModelResponse>>(
      '/report-designer/generate-model',
      { clientId, schema, ...(preferredTheme ? { preferredTheme } : {}) },
      { timeout: AI_MATCH_TIMEOUT_MS, signal }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to generate report model.');
  }
}

/**
 * S9 — "Generate & Publish". Sends the already-generated blueprint (from a prior
 * generateReportModel call) back to koru-main, which chains: LLM-authors TMDL -> deterministic
 * validation -> Power BI dataset deploy. Bounded by AI_MATCH_TIMEOUT_MS and cancellable, same
 * as generateReportModel/matchSchemaModel — the TMDL-authoring step is itself an LLM call.
 *
 * A 422 means the authored TMDL failed deterministic validation and publish was blocked before
 * ever reaching deploy — surfaced here as an error whose message joins every violation, not just
 * the first, so the caller can show the full list.
 */
export async function publishReport(
  clientId: string,
  blueprint: unknown,
  datasetName?: string,
  signal?: AbortSignal
): Promise<PublishReportResponse> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<PublishReportResponse>>(
      '/report-designer/publish',
      { clientId, blueprint, ...(datasetName ? { datasetName } : {}) },
      { timeout: AI_MATCH_TIMEOUT_MS, signal }
    );
    return extractData(res.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      const body = err.response.data as ApiResponse<unknown>;
      const violations = body?.errors?.length ? body.errors.join(' | ') : body?.message;
      throw new Error(violations ?? 'Authored TMDL failed validation — publish blocked before deploy.');
    }
    throw aiCallError(err, 'Failed to publish report.');
  }
}
