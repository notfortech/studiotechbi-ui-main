import { apiService } from './api';

export interface SchemaModelFieldAlias {
  id: string;
  schemaModelFieldId: string;
  fieldName: string;
  schemaModelId: string;
  schemaModelName: string;
  industry: string;
  aliasName: string;
  observedDataType?: string;
  confidence: number;
  source: string;
  approvalStatus: string;
  observedCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  decidedBy?: string;
  decidedAt?: string;
}

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

export async function getPendingAliases(): Promise<SchemaModelFieldAlias[]> {
  const res = await apiService.get<ApiResponse<SchemaModelFieldAlias[]>>(
    '/admin/schema-model-field-aliases/pending'
  );
  return extractData(res);
}

export async function approveAlias(id: string): Promise<SchemaModelFieldAlias> {
  const res = await apiService.post<ApiResponse<SchemaModelFieldAlias>>(
    `/admin/schema-model-field-aliases/${id}/approve`
  );
  return extractData(res);
}

export async function rejectAlias(id: string): Promise<SchemaModelFieldAlias> {
  const res = await apiService.post<ApiResponse<SchemaModelFieldAlias>>(
    `/admin/schema-model-field-aliases/${id}/reject`
  );
  return extractData(res);
}
