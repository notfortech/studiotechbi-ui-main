export interface SuburbPerformanceSeriesPoint {
  period?: string;
  medianPrice?: number;
  volume?: number;
  growthPercent?: number;
  [key: string]: unknown;
}

export interface SuburbPerformanceResponse {
  state?: string;
  suburb?: string;
  postcode?: string;
  medianPrice?: number;
  medianRent?: number;
  annualGrowthPercent?: number;
  listingsCount?: number;
  series?: SuburbPerformanceSeriesPoint[];
  summary?: string;
  [key: string]: unknown;
}
