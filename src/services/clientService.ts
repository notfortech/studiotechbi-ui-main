import { apiService } from './api';

/** Normalized client for UI (DataGrid uses `id`). */
export interface Client {
  id: string;
  name: string;
  tenantId?: string;
  clientCode?: string;
  industry?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  templateVersion?: string;
  /** Short-lived read URL for this client's white-label logo, undefined when none is set. */
  logoUrl?: string;
  /** Admin-declared entitlement — branding only actually renders for this client's users when
   * this is true AND a logo is set. */
  isPremiumSubscriber?: boolean;
}

export interface ClientDetail extends Client {
  blobFolderPath?: string;
  templateAssigned?: string;
  uploads?: Array<{ id: string; fileName: string; uploadedAt: string; status?: string }>;
  validationErrors?: Array<{ id: string; message: string; createdAt: string }>;
  processingJobs?: Array<{ id: string; fileName: string; status: string; createdAt: string }>;
}

/** Backend ClientDto (JSON camelCase). */
interface ClientDto {
  clientId?: string;
  tenantId?: string | null;
  clientCode?: string | null;
  clientName?: string;
  industry?: string | null;
  blobFolderPath?: string | null;
  templateVersion?: string | null;
  logoUrl?: string | null;
  isPremiumSubscriber?: boolean;
  isActive?: boolean;
  createdDate?: string;
  powerBIWorkspaceId?: string | null;
  powerBIDatasetId?: string | null;
  powerBIReportId?: string | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

function unwrapData<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in body) {
    const env = body as ApiEnvelope<T>;
    if (env.data !== undefined) return env.data as T;
  }
  return body as T;
}

function mapClientDto(dto: ClientDto): Client {
  const id = dto.clientId ?? '';
  const name = dto.clientName ?? '';
  const active = dto.isActive !== false;
  return {
    id,
    name,
    tenantId: dto.tenantId ?? undefined,
    clientCode: dto.clientCode ?? undefined,
    industry: dto.industry ?? undefined,
    status: active ? 'active' : 'inactive',
    isActive: active,
    createdAt: dto.createdDate,
    templateVersion: dto.templateVersion ?? undefined,
    logoUrl: dto.logoUrl ?? undefined,
    isPremiumSubscriber: dto.isPremiumSubscriber ?? false,
  };
}

function mapClientDetail(dto: ClientDto): ClientDetail {
  const base = mapClientDto(dto);
  return {
    ...base,
    blobFolderPath: dto.blobFolderPath ?? undefined,
    templateAssigned: dto.templateVersion ?? undefined,
  };
}

export interface CreateClientBody {
  /** Required by API (e.g. AU-001). */
  clientCode: string;
  name: string;
  industry?: string;
  templateVersion?: string;
}

export async function getClients(): Promise<Client[]> {
  const raw = await apiService.get<unknown>('/admin/clients');
  let rows: ClientDto[] = [];

  if (Array.isArray(raw)) {
    rows = raw as ClientDto[];
  } else if (raw && typeof raw === 'object' && raw !== null) {
    const inner = unwrapData<unknown>(raw);
    if (Array.isArray(inner)) {
      rows = inner as ClientDto[];
    } else if (inner && typeof inner === 'object' && 'clients' in inner && Array.isArray((inner as { clients: ClientDto[] }).clients)) {
      rows = (inner as { clients: ClientDto[] }).clients;
    }
  }

  return rows.map(mapClientDto).filter((c) => c.id.length > 0);
}

export async function getClientById(clientId: string): Promise<ClientDetail> {
  const raw = await apiService.get<unknown>(`/admin/clients/${clientId}`);
  const dto = unwrapData<ClientDto>(raw);
  return mapClientDetail(dto);
}

export async function createClient(body: CreateClientBody): Promise<Client> {
  const payload = {
    clientCode: body.clientCode.trim(),
    clientName: body.name.trim(),
    industry: body.industry?.trim() || undefined,
    templateVersion: body.templateVersion?.trim() || undefined,
  };
  const raw = await apiService.post<unknown>('/admin/clients', payload);
  const dto = unwrapData<ClientDto>(raw);
  return mapClientDto(dto);
}

/** The backend's PUT replaces the whole record from the DTO it's sent (no partial-patch
 * semantics), so every update fetches the client's current state first and merges the
 * caller's changes on top -- otherwise fields the caller doesn't know about (like
 * isPremiumSubscriber) would silently reset to their default. */
export async function updateClient(
  clientId: string,
  body: Partial<CreateClientBody & { status: string; isActive?: boolean; isPremiumSubscriber?: boolean }>
): Promise<Client> {
  const current = await getClientById(clientId);

  const name = body.name != null ? body.name.trim() : current.name;
  const industry = body.industry !== undefined ? body.industry?.trim() || undefined : current.industry;
  const templateVersion =
    body.templateVersion !== undefined ? body.templateVersion?.trim() || undefined : current.templateVersion;
  const clientCode = body.clientCode != null ? body.clientCode.trim() : current.clientCode;
  const isPremiumSubscriber =
    body.isPremiumSubscriber !== undefined ? body.isPremiumSubscriber : current.isPremiumSubscriber ?? false;

  let isActive = current.isActive ?? true;
  if (body.status === 'disabled') isActive = false;
  if (body.status === 'active') isActive = true;
  if (body.isActive !== undefined) isActive = body.isActive;

  const payload: Record<string, unknown> = {
    clientName: name,
    industry,
    templateVersion,
    clientCode,
    isPremiumSubscriber,
    isActive,
  };

  const raw = await apiService.put<unknown>(`/admin/clients/${clientId}`, payload);
  const dto = unwrapData<ClientDto>(raw);
  return mapClientDto(dto);
}

export async function disableClient(clientId: string): Promise<void> {
  const detail = await getClientById(clientId);
  await apiService.put(`/admin/clients/${clientId}`, {
    clientName: detail.name,
    industry: detail.industry,
    templateVersion: detail.templateVersion,
    clientCode: detail.clientCode,
    isPremiumSubscriber: detail.isPremiumSubscriber ?? false,
    isActive: false,
  });
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiService.delete(`/admin/clients/${clientId}`);
}

export async function assignUserToClient(clientId: string, userId: string): Promise<void> {
  await apiService.post(`/admin/clients/${clientId}/users/${userId}`);
}

/** Uploads (or replaces) a client's white-label logo. Returns the updated client, including a
 * fresh logoUrl for preview. */
export async function uploadClientLogo(clientId: string, file: File): Promise<Client> {
  const form = new FormData();
  form.append('file', file);
  const raw = await apiService.post<unknown>(`/admin/clients/${clientId}/logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const dto = unwrapData<ClientDto>(raw);
  return mapClientDto(dto);
}

/** Removes a client's white-label logo -- their portal reverts to default StudioTechBI branding. */
export async function deleteClientLogo(clientId: string): Promise<Client> {
  const raw = await apiService.delete<unknown>(`/admin/clients/${clientId}/logo`);
  const dto = unwrapData<ClientDto>(raw);
  return mapClientDto(dto);
}
