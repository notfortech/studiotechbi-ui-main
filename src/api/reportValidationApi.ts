import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { GeneratedReport } from './reportGeneratorApi';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's ReportValidationDtos.cs. Phase 1 populates RenderingHealth + DataSanity
// checks; FilterCorrectness/ExportIntegrity are reserved check-family values for Phase 2.

export type ReportValidationCheckFamily = 'RenderingHealth' | 'DataSanity' | 'FilterCorrectness' | 'ExportIntegrity';
export type ReportValidationCheckStatus = 'Pass' | 'Warning' | 'Fail' | 'Error';
export type ReportValidationRunStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface ReportValidationCheck {
  checkFamily: ReportValidationCheckFamily;
  checkName: string;
  status: ReportValidationCheckStatus;
  detail?: string | null;
  evidence?: unknown;
}

export interface ReportValidationRun {
  runId: string;
  status: ReportValidationRunStatus;
  overallResult?: ReportValidationCheckStatus | null;
  templateId?: string | null;
  templateName?: string | null;
  checks: ReportValidationCheck[];
  createdAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export interface ReportValidationRunSummary {
  runId: string;
  status: ReportValidationRunStatus;
  overallResult?: ReportValidationCheckStatus | null;
  templateName?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ReportValidationRunPage {
  items: ReportValidationRunSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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

/** Same file/templateId/filters shape as generateReport, plus the already-generated report (the
 * exact on-screen snapshot) so Data Sanity validates what the user is actually looking at.
 * Returns immediately (202) with a runId to poll via getReportValidationRun. */
export async function startReportValidation(
  file: File,
  templateId: string | undefined,
  filters: Record<string, string>,
  report: GeneratedReport
): Promise<{ runId: string; status: ReportValidationRunStatus }> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (templateId) form.append('templateId', templateId);
    if (filters && Object.keys(filters).length > 0) form.append('filters', JSON.stringify(filters));
    form.append('report', JSON.stringify(report));
    const res = await apiAxiosInstance.post<ApiResponse<{ runId: string; status: ReportValidationRunStatus }>>(
      '/report-validation/run',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to start report validation.');
  }
}

export async function getReportValidationRun(runId: string): Promise<ReportValidationRun> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportValidationRun>>(
      `/report-validation/runs/${runId}`
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report validation run.');
  }
}

export async function listReportValidationRuns(page = 1, pageSize = 20): Promise<ReportValidationRunPage> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<ReportValidationRunPage>>(
      '/report-validation/runs',
      { params: { page, pageSize } }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load report validation history.');
  }
}
