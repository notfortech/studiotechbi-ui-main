export interface DataConnection {
  id: string;
  name: string;
  type: 'onedrive' | 'sharepoint' | 'database';
}

export interface FileItem {
  path: string;
  name: string;
}

/** Model row from GET /models/{clientId} and polling. */
export interface InsightModel {
  id: string;
  templateId: string;
  confidence: number;
  status: string;
  datasetId?: string;
  reportId?: string;
  /** Optional column preview when the API includes schema. */
  schema?: { columns: string[] };
}

/** Embed payload from GET /reports/{modelId}. */
export interface InsightReport {
  embedUrl?: string;
  reportId?: string;
  datasetId?: string;
  accessToken?: string;
}

export interface OrchestratorResponse {
  datasetId?: string;
  reportId?: string;
  embedUrl?: string;
  accessToken?: string;
  queued?: boolean;
}

/** `TransformSuggestResponse` from InsightsEngine (POST …/transformations/suggest*). */
export interface TransformSuggestInsights {
  provider?: string;
  summary?: string;
  /** Column names or descriptors from the engine. */
  columns?: unknown[];
  issues?: unknown[];
  steps?: unknown[];
  [key: string]: unknown;
}

/** Subset of DB template row returned with verified matches. */
export interface InsightTemplateInfo {
  templateId: string;
  templateName?: string;
  industry?: string;
  version?: string;
  [key: string]: unknown;
}

export interface VerifiedTemplateMatch {
  template: InsightTemplateInfo;
  matchScore: number;
  matchReasons: string[];
}

/** Payload under `data` in ApiResponse from insights-engine suggest endpoints. */
export interface InsightsWithTemplatesResponse {
  insights: TransformSuggestInsights;
  verifiedTemplates: VerifiedTemplateMatch[];
}

/** Read-only tabular sample from report blob (max 100 rows in UI). */
export interface BlobDataSample {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated?: boolean;
  rowCount?: number;
}

/**
 * From GET /api/insights-engine/resolve-blob — use with `suggest-from-blob` so suggestions target the same blob as the sample.
 * May later be redundant if `report-data-sample` DTO includes `blobPath`.
 */
export interface InsightsResolvedBlob {
  /** Client/tenant GUID for POST `suggest-from-blob` body `clientId`. */
  clientId: string;
  /** Blob key/path for POST `suggest-from-blob` body `path`. */
  blobPath: string;
}
