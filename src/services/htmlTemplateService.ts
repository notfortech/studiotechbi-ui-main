import { AxiosError } from 'axios';
import { apiService } from './api';

/**
 * Interactive HTML report templates (chrome.html + manifest.json pairs) -- distinct from the
 * Power BI (.pbix) templates managed on TemplatesPage/templateService.ts. Mirrors koru-main's
 * HtmlTemplateDtos.cs; System.Text.Json's default web casing means every field below is
 * camelCase on the wire even though the C# records use PascalCase properties.
 */

export interface HtmlTemplateSummary {
  id: string;
  name: string;
  industry: string;
  requiredColumns: string[];
  optionalColumns: string[];
  hasPreview: boolean;
  hasThemeSlots: boolean;
  hasError: boolean;
  errorMessage?: string | null;
}

export interface HtmlTemplateUploadResult {
  templateId: string;
  status: 'Created' | 'Updated' | 'Failed';
  errors: string[];
  warnings: string[];
}

export interface HtmlTemplateBulkUploadResponse {
  results: HtmlTemplateUploadResult[];
  created: number;
  updated: number;
  failed: number;
}

export interface HtmlTemplateManifest {
  templateId: string;
  manifestJson: string;
}

export async function listHtmlTemplates(): Promise<HtmlTemplateSummary[]> {
  return apiService.get<HtmlTemplateSummary[]>('/admin/html-templates');
}

/** Accepts the zip shape template-authoring tooling already produces -- any nesting, any wrapper
 * folder, one template optionally loose at the zip root. Validation and index.json merging all
 * happen server-side; see AdminHtmlTemplatesController. */
export async function uploadHtmlTemplateBatch(zipFile: File): Promise<HtmlTemplateBulkUploadResponse> {
  const formData = new FormData();
  formData.append('zip', zipFile);
  return apiService.post<HtmlTemplateBulkUploadResponse>('/admin/html-templates/upload-batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** Un-lists the template from index.json. Blob files are left in place, not hard-deleted. */
export async function deleteHtmlTemplate(id: string): Promise<void> {
  await apiService.delete(`/admin/html-templates/${id}`);
}

/** Runs the background sync cycle immediately instead of waiting up to 5 minutes. */
export async function forceHtmlTemplateSyncNow(): Promise<{ syncedCount: number }> {
  return apiService.post<{ syncedCount: number }>('/admin/html-templates/sync-now');
}

export async function getHtmlTemplateManifest(id: string): Promise<HtmlTemplateManifest> {
  return apiService.get<HtmlTemplateManifest>(`/admin/html-templates/${id}/manifest`);
}

/**
 * Validates server-side before writing. The backend returns 422 (not 200) when validation fails,
 * but the response body is still a well-formed HtmlTemplateUploadResult with the specific errors
 * -- unwrap that here so callers always get a result object back and only need one code path,
 * regardless of whether the save succeeded.
 */
export async function updateHtmlTemplateManifest(id: string, manifestJson: string): Promise<HtmlTemplateUploadResult> {
  try {
    return await apiService.put<HtmlTemplateUploadResult>(`/admin/html-templates/${id}/manifest`, { manifestJson });
  } catch (err) {
    const axiosErr = err as AxiosError<HtmlTemplateUploadResult>;
    if (axiosErr.response?.status === 422 && axiosErr.response.data) {
      return axiosErr.response.data;
    }
    throw err;
  }
}
