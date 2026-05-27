export interface SalesResultRow {
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  salePrice?: number;
  saleDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  propertyType?: string;
  [key: string]: unknown;
}

export interface SalesResultsResponse {
  city?: string;
  results?: SalesResultRow[];
  totalCount?: number;
  [key: string]: unknown;
}
