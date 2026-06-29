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

export async function updateClient(
  clientId: string,
  body: Partial<CreateClientBody & { status: string; isActive?: boolean }>
): Promise<Client> {
  const payload: Record<string, unknown> = {};
  if (body.name != null) payload.clientName = body.name.trim();
  if (body.industry !== undefined) payload.industry = body.industry?.trim() || undefined;
  if (body.templateVersion !== undefined) payload.templateVersion = body.templateVersion?.trim() || undefined;
  if (body.clientCode != null) payload.clientCode = body.clientCode.trim();
  if (body.status === 'disabled') payload.isActive = false;
  if (body.status === 'active') payload.isActive = true;
  if (body.isActive !== undefined) payload.isActive = body.isActive;

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
    isActive: false,
  });
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiService.delete(`/admin/clients/${clientId}`);
}

export async function assignUserToClient(clientId: string, userId: string): Promise<void> {
  await apiService.post(`/admin/clients/${clientId}/users/${userId}`);
}
