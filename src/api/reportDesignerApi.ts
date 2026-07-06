import { apiAxiosInstance } from '../services/apiClient';
import { AxiosError } from 'axios';

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
  starSchema: StarSchema;
  templates: TemplateOption[];
  correlationId: string;
  durationMs: number;
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

export async function generateReportModel(
  schema: ExtractedSchemaDto,
  preferredTheme?: string
): Promise<GenerateReportModelResponse> {
  try {
    const res = await apiAxiosInstance.post<ApiResponse<GenerateReportModelResponse>>(
      '/report-designer/generate-model',
      { schema, ...(preferredTheme ? { preferredTheme } : {}) }
    );
    return extractData(res.data);
  } catch (err) {
    throw err instanceof Error ? err : apiError(err, 'Failed to generate report model.');
  }
}
