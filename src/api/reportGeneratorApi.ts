import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { AiSummary } from '../components/common/AiSummaryPanel';

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

