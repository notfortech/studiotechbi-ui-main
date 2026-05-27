/** Demographics summary for a market / region (shape aligns with Domain integration when available). */
export interface DemographicsMetric {
  label?: string;
  value?: string | number;
  unit?: string;
}

export interface DemographicsResponse {
  region?: string;
  summary?: string;
  population?: number;
  medianAge?: number;
  medianIncome?: number;
  householdSize?: number;
  metrics?: DemographicsMetric[];
  /** Raw payload keys not yet modeled stay extensible without `any`. */
  [key: string]: unknown;
}
