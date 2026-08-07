import { apiAxiosInstance, AI_MATCH_TIMEOUT_MS, DASHBOARD_TEMPLATE_TIMEOUT_MS } from '../services/apiClient';
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

/** "anthropic" = Claude Sonnet, "openai" = OpenAI. Only report-model generation supports
 *  this choice today — Blueprint generation is OpenAI-only with no equivalent switch. */
export type AiProvider = 'anthropic' | 'openai';

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

export type PublishSource = 'MatchedTemplate' | 'GeneratedFromBlueprint';

export interface PublishReportResponse {
  correlationId: string;
  workspaceId: string;
  workspaceName: string;
  datasetId: string;
  datasetName: string;
  datasetCreated: boolean;
  /** Null when source is MatchedTemplate — no new TMDL was authored, so a file count doesn't apply. */
  tmdlFileCount: number | null;
  deploySteps: string[];
  source: PublishSource;
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

// ── Dashboard Template Generator ────────────────────────────────────────────────

export interface TmdlFileDto {
  path: string;
  content: string;
}

export type ProvenanceSource = 'uploaded' | 'mocked';

export interface ProvenanceEntry {
  table: string;
  column: string;
  dataType: string;
  source: ProvenanceSource;
  rowCount: number;
}

export interface GenerateDashboardTemplateResponse {
  correlationId: string;
  provenance: ProvenanceEntry[];
  blendedDatasetBlobPath: string;
  blendedDatasetDownloadUrl: string | null;
  patchedTmdlFiles: TmdlFileDto[];
  tmdlPatched: boolean;
  summary: string;
  /** True once a real Power BI dataset+report was published — workspaceId/datasetId/reportId are
   *  only populated when this is true. False doesn't mean failure of the whole request — Phase
   *  1-2's blended dataset and semantic model are still returned; see visualGenerationLog for why. */
  deployed: boolean;
  workspaceId: string | null;
  datasetId: string | null;
  reportId: string | null;
  /** Type fallbacks, axis auto-inference, unresolved measure/field references, and (if deploy was
   *  attempted) the deploy step-by-step log or failure reason — the single log covering everything
   *  the client needs to know about what's real, what's mocked, and what to fix. */
  visualGenerationLog: string[];
  designBlueprintTemplateId: string | null;
  designBlueprintTier: string | null;
  designBlueprintLabel: string | null;
  /** "MatchedTemplate" when a real published template was found and cloned, "PendingTemplateBuild"
   *  when no confident match was found (a build request was filed for the team), or
   *  "MatchCheckFailed" when the match check or clone itself failed technically. */
  source: string;
  matchedTemplateId: string | null;
  matchedTemplateName: string | null;
  matchConfidence: number | null;
}

// ── Verify Template Match (cheap pre-check, no TMDL authoring / Power BI deploy) ──────────────

export type VerifyTemplateMatchStatus = 'Matched' | 'Pending' | 'Error';

export interface TemplateCandidateSummary {
  templateId: string;
  templateName: string;
  confidence: number;
  isPublishReady: boolean;
}

export interface VerifyTemplateMatchResponse {
  correlationId: string;
  status: VerifyTemplateMatchStatus;
  message: string;
  provenance: ProvenanceEntry[];
  blendedDatasetBlobPath: string | null;
  blendedDatasetDownloadUrl: string | null;
  matchedTemplateId: string | null;
  matchedTemplateName: string | null;
  matchConfidence: number | null;
  candidates: TemplateCandidateSummary[];
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

export type SchemaModelMatchStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

/**
 * Poll response for an async schema-model library match job. `schema` is echoed back from the
 * original request -- lets a caller who only has a matchId (e.g. resuming from a notification
 * click after navigating away) reconstruct the wizard's schema state without re-uploading or
 * re-extracting the source file.
 */
export interface SchemaModelMatchJob {
  matchId: string;
  requestId: string;
  status: SchemaModelMatchStatus;
  schema?: ExtractedSchemaDto;
  result?: ReportMatchResult;
  errorMessage?: string;
  createdAt: string;
  processingStartedAt?: string;
  completedAt?: string;
}

/**
 * Queues a match of the extracted schema against the reference SchemaModel library
 * (deterministic name-overlap first, escalating to AI semantic matching below a confidence gate)
 * and returns immediately with a matchId to poll, instead of blocking the request for the ~330s
 * an AI-escalated match can take — lets the client navigate away from the wizard and come back
 * later. See getSchemaModelMatchStatus. Requires prior consent, same as generateReportModel.
 */
export async function queueSchemaModelMatch(
  clientId: string,
  schema: ExtractedSchemaDto
): Promise<SchemaModelMatchJob> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<SchemaModelMatchJob>>(
      '/report-designer/match',
      { clientId, schema }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to queue schema model match.');
  }
}

/** Poll for the status/result of a queued schema-model match job. */
export async function getSchemaModelMatchStatus(matchId: string): Promise<SchemaModelMatchJob> {
  const res = await apiAxiosInstance.get<ApiResponse<SchemaModelMatchJob>>(
    `/report-designer/match/${matchId}`
  );
  return extractData(res.data);
}

/** Imperative poll-until-done for a queued schema-model match job, mirroring
 * pollReportModelGenerationUntilDone — used while the wizard stays on the model step so
 * matchResult/matchError keep updating live, same as the old synchronous call did. */
export async function pollSchemaModelMatchUntilDone(
  matchId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<SchemaModelMatchJob> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 20 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const status = await getSchemaModelMatchStatus(matchId);
    if (status.status === 'Completed' || status.status === 'Failed') return status;
    if (Date.now() >= deadline) throw new Error('Timed out waiting for schema model match to finish.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
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

export type ReportModelGenerationStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

/**
 * Poll response for an async Data Model generation job. `schema` is echoed back from the
 * original request -- lets a caller who only has a generationId (e.g. resuming from a
 * notification click after navigating away) reconstruct the wizard's schema state without
 * re-uploading or re-extracting the source file.
 */
export interface ReportModelGenerationJob {
  generationId: string;
  requestId: string;
  status: ReportModelGenerationStatus;
  schema?: ExtractedSchemaDto;
  result?: GenerateReportModelResponse;
  errorMessage?: string;
  createdAt: string;
  processingStartedAt?: string;
  completedAt?: string;
}

/**
 * Queues the AI-assisted "Data Model" generation and returns immediately with a generationId to
 * poll, instead of blocking the request for the ~330s the LLM call can take — lets the client
 * navigate away from the wizard and come back later. See getReportModelGenerationStatus.
 */
export async function queueReportModelGeneration(
  clientId: string,
  schema: ExtractedSchemaDto,
  preferredTheme?: string,
  aiProvider?: AiProvider
): Promise<ReportModelGenerationJob> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ReportModelGenerationJob>>(
      '/report-designer/generate-model',
      {
        clientId,
        schema,
        ...(preferredTheme ? { preferredTheme } : {}),
        ...(aiProvider ? { aiProvider } : {}),
      }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to queue report model generation.');
  }
}

/** Poll for the status/result of a queued Data Model generation job. */
export async function getReportModelGenerationStatus(generationId: string): Promise<ReportModelGenerationJob> {
  const res = await apiAxiosInstance.get<ApiResponse<ReportModelGenerationJob>>(
    `/report-designer/generate-model/${generationId}`
  );
  return extractData(res.data);
}

/** Imperative poll-until-done for a queued Data Model generation job, mirroring
 * reportGeneratorApi's pollReportGenerationJobUntilDone — used while the wizard stays on the
 * model step so modelResult/modelError keep updating live, same as the old synchronous call did. */
export async function pollReportModelGenerationUntilDone(
  generationId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<ReportModelGenerationJob> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 20 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const status = await getReportModelGenerationStatus(generationId);
    if (status.status === 'Completed' || status.status === 'Failed') return status;
    if (Date.now() >= deadline) throw new Error('Timed out waiting for report model generation to finish.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
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
 *
 * templateId, when supplied, should come from a ReportMatchCandidateTemplate the caller already
 * showed the client as a match (matchResult.candidateTemplates, filtered to isPublishReady) —
 * koru-main trusts this choice rather than re-matching server-side. When it resolves to a
 * publish-ready template, publish rebinds that existing dataset instead of authoring a new one.
 */
export async function publishReport(
  clientId: string,
  blueprint: unknown,
  datasetName?: string,
  signal?: AbortSignal,
  templateId?: string
): Promise<PublishReportResponse> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<PublishReportResponse>>(
      '/report-designer/publish',
      { clientId, blueprint, ...(datasetName ? { datasetName } : {}), ...(templateId ? { templateId } : {}) },
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

/**
 * Dashboard Template Generator — POST /dashboard-template/generate. Sends the client's originally
 * uploaded file alongside the already-generated blueprint (Analytics Blueprint from
 * generateReportModel, or a pasted Design Blueprint — auto-detected server-side): blends real
 * values with clearly-labeled mock data, generates a real report with visuals, and publishes it
 * to the same Power BI tenant the embed flow already uses. Bounded by
 * DASHBOARD_TEMPLATE_TIMEOUT_MS — longer than AI_MATCH_TIMEOUT_MS since this also waits on a
 * Power BI import that can itself take up to ~60s server-side on top of TMDL authoring.
 *
 * Deploy failure doesn't throw — a non-2xx from the deploy step still resolves with
 * `deployed: false` and the reason folded into `visualGenerationLog`, so the blended dataset and
 * semantic model (still generated) aren't lost behind a thrown error.
 */
export async function generateDashboardTemplate(
  clientId: string,
  file: File,
  blueprint: unknown,
  signal?: AbortSignal
): Promise<GenerateDashboardTemplateResponse> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('clientId', clientId);
    form.append('blueprint', JSON.stringify(blueprint));

    const res = await apiAxiosInstance.post<ApiResponse<GenerateDashboardTemplateResponse>>(
      '/dashboard-template/generate',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: DASHBOARD_TEMPLATE_TIMEOUT_MS,
        signal,
      }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to generate dashboard template.');
  }
}

/**
 * Dashboard Template Generator — POST /dashboard-template/verify-match. A cheap pre-check that
 * blends the file and checks the real template catalog for a match, without authoring a TMDL or
 * making any Power BI calls — meant to gate generateDashboardTemplate so the client only commits
 * to the slower call once this comes back with status "Matched". Same multipart contract and
 * timeout budget as generateDashboardTemplate, since the blend step itself is the same work.
 */
export async function verifyTemplateMatch(
  clientId: string,
  file: File,
  blueprint: unknown,
  signal?: AbortSignal
): Promise<VerifyTemplateMatchResponse> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('clientId', clientId);
    form.append('blueprint', JSON.stringify(blueprint));

    const res = await apiAxiosInstance.post<ApiResponse<VerifyTemplateMatchResponse>>(
      '/dashboard-template/verify-match',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: DASHBOARD_TEMPLATE_TIMEOUT_MS,
        signal,
      }
    );
    return extractData(res.data);
  } catch (err) {
    throw aiCallError(err, 'Failed to verify template match.');
  }
}
