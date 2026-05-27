export interface PropertyResponse {
  id?: string;
  listingId?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  landArea?: number;
  buildingArea?: number;
  propertyType?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  attributes?: Record<string, string | number | boolean | undefined>;
  [key: string]: unknown;
}
