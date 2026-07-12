import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

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
}

export interface ReportChartSeries {
  name: string;
  values: number[];
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

export interface GeneratedReport {
  templateId?: string;
  templateName?: string;
  primaryTable?: string;
  kpis: ReportKpi[];
  charts: ReportChart[];
  slicers: ReportSlicer[];
  appliedFilters: Record<string, string>;
  warnings: string[];
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

export async function generateReport(
  file: File,
  templateId?: string,
  filters?: Record<string, string>
): Promise<GeneratedReport> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (templateId) form.append('templateId', templateId);
    if (filters && Object.keys(filters).length > 0) form.append('filters', JSON.stringify(filters));
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
