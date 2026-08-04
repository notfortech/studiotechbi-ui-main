import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';
import type { GeneratedReport } from './reportGeneratorApi';

// ── DTOs ──────────────────────────────────────────────────────────────────────
// Mirrors koru-main's SavedReportDtos.cs.

export type SavedReportSourceType = 'GeneratedHtml' | 'PowerBiRequestFulfilled';

export interface SavedReportSummary {
  savedReportId: string;
  title: string;
  sourceType: SavedReportSourceType;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  /** Set only for sourceType === 'PowerBiRequestFulfilled'. */
  powerBiAssetId?: string | null;
}

export interface SavedReportDetail {
  savedReportId: string;
  title: string;
  sourceType: SavedReportSourceType;
  status: string;
  /** Populated only for sourceType === 'GeneratedHtml'. */
  htmlReport?: string | null;
  powerBiAssetId?: string | null;
  createdAt: string;
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

/** Persists the exact report.htmlReport string already on screen — an explicit, one-shot save;
 * re-saving the same report/template pair creates a new entry rather than overwriting. */
export async function saveReport(report: GeneratedReport, sourceFileName?: string): Promise<{ savedReportId: string; versionNumber: number }> {
  if (!report.htmlReport) {
    throw new Error('This report has no interactive HTML to save.');
  }
  try {
    const res = await apiAxiosInstance.post<ApiResponse<{ savedReportId: string; versionNumber: number }>>(
      '/saved-reports',
      {
        htmlReport: report.htmlReport,
        templateId: report.templateId,
        templateName: report.templateName,
        htmlTemplateId: report.htmlTemplateId,
        htmlTemplateName: report.htmlTemplateName,
        sourceFileName,
        appliedFilters: report.appliedFilters,
      }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to save report.');
  }
}

export async function listSavedReports(): Promise<SavedReportSummary[]> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<SavedReportSummary[]>>('/saved-reports');
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load saved reports.');
  }
}

export async function getSavedReport(savedReportId: string): Promise<SavedReportDetail> {
  try {
    const res = await apiAxiosInstance.get<ApiResponse<SavedReportDetail>>(`/saved-reports/${savedReportId}`);
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to load saved report.');
  }
}

export async function archiveSavedReport(savedReportId: string): Promise<void> {
  try {
    await apiAxiosInstance.delete(`/saved-reports/${savedReportId}`);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to archive saved report.');
  }
}
