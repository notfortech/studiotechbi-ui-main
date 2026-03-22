import { apiService } from './api';
import { ApiResponse, PaginatedResult, unwrapApiResponse, unwrapPaginated } from './adminApiTypes';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  /** 0 = general client, 1 = accountant (client assignment). */
  userType: number;
  tenantId?: string;
  clientId?: string;
  lastLoginAt?: string;
  createdAt?: string;
  roles: string[];
}

/** 0 = general client, 1 = accountant (requires client assignment on create). */
export const ADMIN_USER_TYPE = {
  general: 0,
  accountant: 1,
} as const;

export interface AdminUserCreateDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  /** 0 = general client, 1 = accountant. */
  userType?: number;
  tenantId?: string;
  /** Required when userType is 1 (sent as client PK / id from admin clients list). */
  clientId?: string;
  roleIds?: string[];
}

export interface AdminUserUpdateDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  /** 0 = general client, 1 = accountant. */
  userType?: number;
  tenantId?: string;
  /** Set when accountant; send `null` to clear when switching to general client. */
  clientId?: string | null;
}

export interface AdminUserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getAdminUsers(params?: AdminUserListParams): Promise<PaginatedResult<AdminUserDto>> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  let url = `/admin/users?page=${page}&pageSize=${pageSize}`;
  if (params?.search?.trim()) url += `&search=${encodeURIComponent(params.search.trim())}`;
  const raw = await apiService.get<ApiResponse<PaginatedResult<AdminUserDto>> | PaginatedResult<AdminUserDto>>(url);
  return unwrapPaginated<AdminUserDto>(unwrapApiResponse(raw as ApiResponse<PaginatedResult<AdminUserDto>>) ?? raw);
}

export async function getAdminUserById(id: string): Promise<AdminUserDto> {
  const raw = await apiService.get<ApiResponse<AdminUserDto> | AdminUserDto>(`/admin/users/${id}`);
  const data = unwrapApiResponse(raw as ApiResponse<AdminUserDto>);
  if (data) return data;
  return raw as AdminUserDto;
}

export async function createAdminUser(body: AdminUserCreateDto): Promise<AdminUserDto> {
  const raw = await apiService.post<ApiResponse<AdminUserDto> | AdminUserDto>('/admin/users', body);
  const data = unwrapApiResponse(raw as ApiResponse<AdminUserDto>);
  if (data) return data;
  return raw as AdminUserDto;
}

export async function updateAdminUser(id: string, body: AdminUserUpdateDto): Promise<AdminUserDto> {
  const raw = await apiService.put<ApiResponse<AdminUserDto> | AdminUserDto>(`/admin/users/${id}`, body);
  const data = unwrapApiResponse(raw as ApiResponse<AdminUserDto>);
  if (data) return data;
  return raw as AdminUserDto;
}

export async function setAdminUserActive(id: string, isActive: boolean): Promise<void> {
  await apiService.patch(`/admin/users/${id}/disable`, { isActive });
}

export async function setAdminUserRoles(id: string, roleIds: string[]): Promise<void> {
  await apiService.post(`/admin/users/${id}/roles`, { roleIds });
}
