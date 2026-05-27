export const propertyQueryKeys = {
  all: ['property'] as const,
  demographics: (state: string, suburb: string, postcode: string) =>
    [...propertyQueryKeys.all, 'demographics', state, suburb, postcode] as const,
  salesResultsHead: () => [...propertyQueryKeys.all, 'salesResultsHead'] as const,
  salesResults: (city: string) => [...propertyQueryKeys.all, 'salesResults', city] as const,
  cityListings: (city: string) => [...propertyQueryKeys.all, 'cityListings', city] as const,
  propertyDetails: (id: string) => [...propertyQueryKeys.all, 'property', id] as const,
  suburbPerformance: (state: string, suburb: string) =>
    [...propertyQueryKeys.all, 'suburbPerformance', state, suburb] as const,
  suburbPerformancePostcode: (state: string, suburb: string, postcode: string) =>
    [...propertyQueryKeys.all, 'suburbPerformancePostcode', state, suburb, postcode] as const,
  locationProfile: (domainLocationId: string) =>
    [...propertyQueryKeys.all, 'locationProfile', domainLocationId] as const,
  addressLocators: (searchText: string) =>
    [...propertyQueryKeys.all, 'addressLocators', searchText] as const,
  disclaimers: () => [...propertyQueryKeys.all, 'disclaimers'] as const,
  disclaimersByProduct: (product: string) =>
    [...propertyQueryKeys.all, 'disclaimers', product] as const,
};
