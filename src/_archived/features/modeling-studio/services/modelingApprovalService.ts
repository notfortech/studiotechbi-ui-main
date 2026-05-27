import { apiService } from '../../../services/api';

import type { ApiResponse } from '../../../services/adminApiTypes';
import { unwrapApiResponse } from '../../../services/adminApiTypes';
import type { ModelSummary } from '../types';

type AnyRecord = Record<string, unknown>;

function asRecord(v: unknown): AnyRecord | null {
  return v && typeof v === 'object' ? (v as AnyRecord) : null;
}

function str(o: AnyRecord, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

function num(o: AnyRecord, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return undefined;
}

export function parseModelSummary(raw: unknown): ModelSummary {
  const u = unwrapApiResponse(raw as ApiResponse<unknown>);
  const o = asRecord(u);
  if (!o) {
    return {
      modelId: '',
      templateId: '',
      confidence: 0,
      transformations: [],
      relationships: [],
      excludedColumns: [],
    };
  }

  const relationshipsRaw = Array.isArray(o.relationships) ? (o.relationships as unknown[]) : [];
  const relationships = relationshipsRaw
    .map((r) => {
      const rr = asRecord(r);
      if (!rr) return null;
      const from = str(rr, 'from') ?? '';
      const to = str(rr, 'to') ?? '';
      const matchRate = num(rr, 'matchRate', 'match_rate') ?? 0;
      if (!from || !to) return null;
      return { from, to, matchRate };
    })
    .filter((r): r is { from: string; to: string; matchRate: number } => r !== null);

  return {
    modelId: str(o, 'modelId', 'model_id', 'id') ?? '',
    templateId: str(o, 'templateId', 'template_id') ?? '',
    confidence: num(o, 'confidence', 'score') ?? 0,
    transformations: Array.isArray(o.transformations)
      ? (o.transformations as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    relationships,
    excludedColumns: Array.isArray(o.excludedColumns)
      ? (o.excludedColumns as unknown[]).filter((c): c is string => typeof c === 'string')
      : [],
  };
}

/**
 * STEP 1: Generate models (summary-only).
 * Backend returns summary + transformations + relationships; TOM stays server-side.
 */
export async function suggestModelSummaryFromBlob(params: {
  clientId: string;
  templateId?: string;
  blobPath?: string;
}): Promise<ModelSummary> {
  const body: AnyRecord = { clientId: params.clientId };
  if (params.templateId) body.templateId = params.templateId;
  if (params.blobPath) body.blobPath = params.blobPath;

  const raw = await apiService.post<ApiResponse<ModelSummary> | ModelSummary>(
    '/insights-engine/models/suggest-from-blob',
    body
  );
  return parseModelSummary(raw);
}

/**
 * STEP 6: Send approval to backend.
 */
export async function approveModel(params: {
  clientId: string;
  modelId: string;
  approved: boolean;
}): Promise<void> {
  await apiService.post<ApiResponse<unknown> | unknown>('/models/approve', {
    clientId: params.clientId,
    modelId: params.modelId,
    approved: params.approved,
  });
}

