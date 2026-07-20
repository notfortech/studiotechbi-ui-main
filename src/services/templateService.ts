import { API_BASE_URL } from '../core/constants';
import { apiService } from './api';

export interface Template {
  id: string;
  name: string;
  industry?: string;
  version?: string;
  uploadDate?: string;
  /** Backend TemplateDto may include */
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Columns TemplateMatchingService scores a client's schema against (TemplateDto.RequiredColumns/OptionalColumns) */
  requiredColumns?: string[];
  optionalColumns?: string[];
}

export interface TemplateUploadFields {
  templateName: string;
  version: string;
  industry?: string;
  requiredColumns: string[];
  optionalColumns: string[];
  file: File;
}

export async function getTemplates(): Promise<Template[]> {
  const data = await apiService.get<Template[] | { templates: Template[] }>('/admin/templates');
  return Array.isArray(data) ? data : (data as { templates: Template[] }).templates ?? [];
}

export async function getTemplateById(id: string): Promise<Template> {
  return apiService.get<Template>(`/admin/templates/${id}`);
}

/**
 * Create/upload a template. Maps to TemplateCreateDto (koru-main):
 * TemplateName, Version (required), Industry, RequiredColumns, OptionalColumns.
 * RequiredColumns/OptionalColumns are List<string> on the backend, bound from
 * repeated form fields of the same key.
 */
export async function uploadTemplate(fields: TemplateUploadFields): Promise<Template> {
  const formData = new FormData();
  formData.append('TemplateName', fields.templateName);
  formData.append('Version', fields.version);
  if (fields.industry) formData.append('Industry', fields.industry);
  fields.requiredColumns.forEach((col) => formData.append('RequiredColumns', col));
  fields.optionalColumns.forEach((col) => formData.append('OptionalColumns', col));
  formData.append('file', fields.file);

  return apiService.post<Template>('/admin/templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** Download template file; returns blob URL or triggers download. Backend returns file stream. */
export async function downloadTemplate(templateId: string): Promise<void> {
  const baseUrl = API_BASE_URL;
  const token = localStorage.getItem('authToken');
  const url = `${baseUrl}/admin/templates/${templateId}/download`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `template-${templateId}.xlsx`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
