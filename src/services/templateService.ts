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
}

export async function getTemplates(): Promise<Template[]> {
  const data = await apiService.get<Template[] | { templates: Template[] }>('/admin/templates');
  return Array.isArray(data) ? data : (data as { templates: Template[] }).templates ?? [];
}

export async function getTemplateById(id: string): Promise<Template> {
  return apiService.get<Template>(`/admin/templates/${id}`);
}

/** Create/upload: form-data with dto fields + optional file */
export async function uploadTemplate(formData: FormData): Promise<Template> {
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
