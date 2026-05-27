export interface LocationProfileResponse {
  domainLocationId?: string | number;
  name?: string;
  type?: string;
  state?: string;
  postcode?: string;
  centroid?: { lat?: number; lng?: number };
  statistics?: Record<string, string | number | undefined>;
  [key: string]: unknown;
}
