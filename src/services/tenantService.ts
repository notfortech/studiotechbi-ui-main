import { apiService } from './api';
import { ApiResponse, PaginatedResult, unwrapApiResponse, unwrapPaginated } from './adminApiTypes';

export interface TenantDto {
  id: string;
  name: string;
  code: string;
  industry?: string;
  country?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantCreateDto {
  name: string;
  code: string;
  industry?: string;
  country?: string;
}

export interface TenantUpdateDto {
  name?: string;
  industry?: string;
  country?: string;
}

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getTenants(params?: TenantListParams): Promise<PaginatedResult<TenantDto>> {
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 20, 100);
  const search = params?.search?.trim();
  let url = `/admin/tenants?page=${page}&pageSize=${pageSize}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const raw = await apiService.get<ApiResponse<PaginatedResult<TenantDto>> | PaginatedResult<TenantDto>>(url);
  return unwrapPaginated<TenantDto>(unwrapApiResponse(raw as ApiResponse<PaginatedResult<TenantDto>>) ?? raw);
}

export async function getTenantById(tenantId: string): Promise<TenantDto> {
  const raw = await apiService.get<ApiResponse<TenantDto> | TenantDto>(`/admin/tenants/${tenantId}`);
  const data = unwrapApiResponse(raw as ApiResponse<TenantDto>);
  if (data) return data;
  return raw as TenantDto;
}

export async function createTenant(body: TenantCreateDto): Promise<TenantDto> {
  const raw = await apiService.post<ApiResponse<TenantDto> | TenantDto>('/admin/tenants', body);
  const data = unwrapApiResponse(raw as ApiResponse<TenantDto>);
  if (data) return data;
  return raw as TenantDto;
}

export async function updateTenant(tenantId: string, body: TenantUpdateDto): Promise<TenantDto> {
  const raw = await apiService.put<ApiResponse<TenantDto> | TenantDto>(`/admin/tenants/${tenantId}`, body);
  const data = unwrapApiResponse(raw as ApiResponse<TenantDto>);
  if (data) return data;
  return raw as TenantDto;
}

export async function setTenantStatus(tenantId: string, isActive: boolean): Promise<void> {
  await apiService.patch(`/admin/tenants/${tenantId}/status`, { isActive });
}
