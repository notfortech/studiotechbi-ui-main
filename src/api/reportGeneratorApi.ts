import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { AiSummary } from '../components/common/AiSummaryPanel';
import type { ProvenanceEntry } from './reportDesignerApi';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's ReportGeneratorDtos.cs, which mirrors
// DashboardAgents.ReportAgent.Api's JSON output. No AI touches this data at
// any point in the pipeline — a deterministic engine computes these values.

export interface ReportTemplateOption {
  id: string;
  name: string;
  industry?: string | null;
  description?: string;
  requires?: Record<string, number>;
}

export interface ReportKpi {
  label: string;
  value: number;
  column: string;
  aggregation: string;
  change?: number | null;
  unit?: string | null;
}

export interface ReportChartSeries {
  name: string;
  values: number[];
  unit?: string | null;
  percentOfTotal?: number[] | null;
}

export interface ReportChart {
  type: 'line' | 'bar';
  title: string;
  x?: string[];
  categories?: string[];
  series: ReportChartSeries[];
}

export interface ReportSlicer {
  column: string;
  values: string[];
}

export interface HtmlTemplateCandidate {
  templateId: string;
  templateName: string;
  confidence: number;
  industry?: string | null;
}

export interface GeneratedReport {
  templateId?: string;
  templateName?: string;
  primaryTable?: string;
  kpis: ReportKpi[];
  charts: ReportChart[];
  slicers: ReportSlicer[];
  appliedFilters: Record<string, string>;
  warnings: string[];
  /** Row-level records projected to the matched HTML template's declared data contract — already
   * embedded inside htmlReport's own <script> block; exposed here too so the wizard can pass it
   * straight through to Save Report without re-parsing the HTML string. */
  rowData?: Record<string, unknown>[] | null;
  htmlTemplateId?: string | null;
  htmlTemplateName?: string | null;
  htmlMatchConfidence?: number | null;
  /** The fully-assembled, self-contained HTML report string (chrome + real data already
   * injected) — render via <iframe srcDoc>, never dangerouslySetInnerHTML. Absent when no HTML
   * template matched at all; the caller falls back to the KPI/chart grid below in that case. */
  htmlReport?: string | null;
  /** AI-assisted "closest template" fallback only (see ReportGeneratorController.GenerateAsync):
   * populated when no confident HTML match existed, but a closest role-gate-passing candidate was
   * found and blended with mock data for the gaps. htmlTemplateId/htmlReport stay null even here —
   * this fallback always renders as the classic KPI/chart view (Export PDF only, no Save Report). */
  closestTemplateId?: string | null;
  closestTemplateName?: string | null;
  blendProvenance?: ProvenanceEntry[] | null;
  blendedDatasetDownloadUrl?: string | null;
  blendNote?: string | null;
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

// ── API calls ─────────────────────────────────────────────────────────────────

export async function listReportTemplates(): Promise<ReportTemplateOption[]> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportTemplateOption[]>>(
      '/report-generator/templates'
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report templates.');
  }
}

export interface ReportUploadLimits {
  /** Below this, use the fast synchronous generateReport() call unchanged. At/above it, route
   * through initReportUpload/completeReportUpload instead (the direct-to-blob async path). */
  maxUploadBytes: number;
  /** The real hard ceiling for the async path — always >= maxUploadBytes. Reject client-side
   * above this; the server re-verifies the real committed blob size regardless. */
  maxAsyncUploadBytes: number;
}

/** The server-configured upload size thresholds (see koru-main's UploadLimitsOptions) — fetched
 * rather than hardcoded so the client-side check can never silently drift from what the backend
 * actually enforces. Callers should treat a failed fetch as "no client-side check possible this
 * time" and let the upload proceed to the server's own enforcement, rather than blocking the user. */
export async function getUploadLimits(): Promise<ReportUploadLimits> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportUploadLimits>>(
      '/report-generator/upload-limits'
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load upload limits.');
  }
}

// ── Large-file upload: direct-to-blob + durable async processing ───────────────────────────────
// Used only for files at/above the configured threshold — see reportUploadService.ts for the
// direct-to-blob PUT itself. Small files keep using generateReport() above, unchanged.

export interface ReportUploadInit {
  jobId: string;
  writeUrl: string;
  blobPath: string;
  expiresAtUtc: string;
}

export interface ReportGenerationJobStatus {
  jobId: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  result: GeneratedReport | null;
  errorMessage: string | null;
}

/** Mints a write-only SAS URL + a Pending job row for a large file, before any bytes move. */
export async function initReportUpload(fileName: string): Promise<ReportUploadInit> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<ReportUploadInit>>(
      '/report-generator/uploads/init',
      { fileName }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to prepare the upload.');
  }
}

/** Called once the direct-to-blob PUT finishes — the same optional fields generateReport() takes,
 * carried as JSON since no file rides along on this call. Enqueues the async job on success. */
export async function completeReportUpload(
  jobId: string,
  templateId?: string,
  filters?: Record<string, string>,
  htmlTemplateId?: string,
  mode?: 'strict' | 'ai',
  isRefinement?: boolean,
  themePrimary?: string,
  themeDark?: string,
  themeLight?: string,
  themeBg?: string
): Promise<{ jobId: string; status: string }> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ jobId: string; status: string }>>(
      `/report-generator/uploads/${jobId}/complete`,
      {
        templateId: templateId ?? null,
        filters: filters && Object.keys(filters).length > 0 ? JSON.stringify(filters) : null,
        htmlTemplateId: htmlTemplateId ?? null,
        mode: mode ?? null,
        isRefinement: !!isRefinement,
        themePrimary: themePrimary ?? null,
        themeDark: themeDark ?? null,
        themeLight: themeLight ?? null,
        themeBg: themeBg ?? null,
      }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to confirm the upload.');
  }
}

export async function getReportGenerationJobStatus(jobId: string): Promise<ReportGenerationJobStatus> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportGenerationJobStatus>>(
      `/report-generator/jobs/${jobId}`
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to check job status.');
  }
}

/** Imperative poll-until-done, for use inside an already-async handler (e.g. handleGenerateReport)
 * rather than a React hook — hooks can't be invoked conditionally/imperatively from a callback.
 * useReportGenerationJob (the hook) covers the "dedicated screen watching a job" case instead. */
export async function pollReportGenerationJobUntilDone(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<ReportGenerationJobStatus> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 20 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const status = await getReportGenerationJobStatus(jobId);
    if (status.status === 'Completed' || status.status === 'Failed') return status;
    if (Date.now() >= deadline) throw new Error('Timed out waiting for report generation to finish.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** `mode` and `isRefinement` drive Report Stats' generation-event log (koru-main only writes a
 * ReportGenerationEvent row when isRefinement is falsy) — pass `isRefinement: true` for a filter
 * re-apply against an already-generated report so it isn't double-counted as a new report.
 * `themePrimary`/`themeDark`/`themeLight`/`themeBg` are the resolved hex colors from the wizard's
 * existing theme picker (reportThemes.tsx) — when a matched HTML template's manifest declares a
 * themeSlots mapping, koru-main overrides that template's own palette to match; omitted/absent
 * fields leave the template's authored default colors untouched. */
export async function generateReport(
  file: File,
  templateId?: string,
  filters?: Record<string, string>,
  htmlTemplateId?: string,
  mode?: 'strict' | 'ai',
  isRefinement?: boolean,
  themePrimary?: string,
  themeDark?: string,
  themeLight?: string,
  themeBg?: string
): Promise<GeneratedReport> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (templateId) form.append('templateId', templateId);
    if (filters && Object.keys(filters).length > 0) form.append('filters', JSON.stringify(filters));
    if (htmlTemplateId) form.append('htmlTemplateId', htmlTemplateId);
    if (mode) form.append('mode', mode);
    if (isRefinement) form.append('isRefinement', 'true');
    if (themePrimary) form.append('themePrimary', themePrimary);
    if (themeDark) form.append('themeDark', themeDark);
    if (themeLight) form.append('themeLight', themeLight);
    if (themeBg) form.append('themeBg', themeBg);
    const res = await apiAxiosInstance.post<ApiResponse<GeneratedReport>>(
      '/report-generator/generate',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to generate report.');
  }
}

/** AI-assisted "Verify Template Match" — full ranked HTML template candidate list, already
 * filtered to >=85% confidence server-side (see koru-main's ReportGeneratorController.
 * HtmlMatchConfidenceThreshold) so a low-confidence guess is never shown to the user. */
export async function verifyHtmlTemplateMatch(file: File): Promise<HtmlTemplateCandidate[]> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await apiAxiosInstance.post<ApiResponse<{ correlationId: string; candidates: HtmlTemplateCandidate[] }>>(
      '/report-generator/verify-html-match',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return extractData(res.data).candidates;
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to verify template match.');
  }
}

// ── Closest-template blend fallback (AI-assisted mode only) ─────────────────────
// blendedDatasetDownloadUrl is a short-lived Azure Blob SAS URL, not a koru-main API path — fetch
// it directly (no auth header, no apiAxiosInstance base URL) rather than routing through the API.

/** Triggers a browser download of the proposed/blended dataset from its SAS URL, using the same
 * createObjectURL/<a download>/revokeObjectURL sequence already used elsewhere in this app
 * (see blueprintApi.ts's downloadBlueprintPdf, templateService.ts's downloadTemplate). */
export async function downloadBlendedDataset(url: string, closestTemplateId: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download the proposed dataset.');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${closestTemplateId}-proposed-data.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// ── AI summary ────────────────────────────────────────────────────────────────
// Operates on an already-generated report — no re-upload of the source file.

/** Re-exported for backward compatibility — the canonical type now lives alongside the shared
 * AiSummaryPanel component, since Blueprint Generator's "Ask AI Assistant" reuses both. */
export type { AiSummary as ReportAiSummary } from '../components/common/AiSummaryPanel';

/** `question`, when supplied, asks that specific follow-up instead of the general
 * "explain this report" summary — used by AiSummaryPanel's clickable follow-up chips. */
export async function getReportAiSummary(report: GeneratedReport, question?: string): Promise<AiSummary> {
  try {
    // Not wrapped in ApiResponse<T> — mirrors ReportsController's /reports/ai-insights
    // shape, which returns { enabled, ... } directly rather than the standard envelope.
    const res = await apiAxiosInstance.post<AiSummary>(
      '/report-generator/ai-summary',
      report,
      question ? { params: { question } } : undefined
    );
    return res.data;
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to generate AI summary.');
  }
}

