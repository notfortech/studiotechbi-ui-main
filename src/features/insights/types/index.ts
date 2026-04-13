export interface DataConnection {
  id: string;
  name: string;
  type: 'onedrive' | 'sharepoint' | 'database';
}

export interface FileItem {
  path: string;
  name: string;
}

export interface ModelOption {
  id: string;
  templateId: string;
  confidence: number;
  schema: {
    columns: string[];
  };
}

/** Optional fields returned while polling or on completed jobs. */
export type ModelOptionWithEmbed = ModelOption & {
  datasetId?: string;
  reportId?: string;
  embedUrl?: string;
  accessToken?: string;
};

export interface OrchestratorResponse {
  datasetId?: string;
  reportId?: string;
  embedUrl?: string;
  accessToken?: string;
  queued?: boolean;
}
