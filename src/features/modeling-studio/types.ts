export type StepStatus = 'approved' | 'rejected' | 'pending';

export type StepGroup = 'transformations' | 'mappings' | 'relationships';

export interface PreviewTable {
  columns: string[];
  rows: Record<string, string>[];
}

export interface ModelingStep {
  id: string;
  group: Exclude<StepGroup, 'relationships'>;
  name: string;
  status: StepStatus;
  plainLanguageSummary: string;
  recommendation: string;
  rejectImpact: string;
  previewBefore: PreviewTable;
  previewAfter: PreviewTable;
  /** Column keys that change when this step is applied */
  affectedColumns: string[];
}

export interface ModelingRelationship {
  id: string;
  from: string;
  to: string;
  matchRate: number;
  status: StepStatus;
  plainLanguageSummary: string;
  recommendation: string;
  rejectImpact: string;
}

export type Selection =
  | { kind: 'step'; id: string }
  | { kind: 'relationship'; id: string }
  | null;
