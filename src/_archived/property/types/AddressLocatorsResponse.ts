export interface AddressLocatorSuggestion {
  id?: string;
  displayText?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  domainLocationId?: string | number;
  [key: string]: unknown;
}

export interface AddressLocatorsResponse {
  suggestions?: AddressLocatorSuggestion[];
  items?: AddressLocatorSuggestion[];
  [key: string]: unknown;
}
