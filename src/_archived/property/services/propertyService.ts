import { apiAxiosInstance } from '../apiClient';
import type {
  AddressLocatorSuggestion,
  AddressLocatorsResponse,
} from '../../types/property/AddressLocatorsResponse';
import type { DemographicsResponse } from '../../types/property/DemographicsResponse';
import type { LocationProfileResponse } from '../../types/property/LocationProfileResponse';
import type { PropertyResponse } from '../../types/property/PropertyResponse';
import type { SalesResultsResponse } from '../../types/property/SalesResultsResponse';
import type { SuburbPerformanceResponse } from '../../types/property/SuburbPerformanceResponse';
import { unwrapPropertyApiResponse } from './propertyApiResponse';

/** Query param name for address locator search; change here if the API contract uses a different name. */
export const ADDRESS_LOCATOR_SEARCH_PARAM = 'searchText';

export interface DemographicsParams {
  state: string;
  suburb: string;
  postcode?: string;
}

function normalizeSalesResultsPayload(raw: unknown): SalesResultsResponse {
  if (raw == null) return {};
  if (Array.isArray(raw)) {
    return { results: raw as SalesResultsResponse['results'] };
  }
  if (typeof raw === 'object') {
    return raw as SalesResultsResponse;
  }
  return {};
}

function normalizeAddressLocatorsPayload(raw: unknown): AddressLocatorsResponse {
  if (raw == null) return {};
  if (Array.isArray(raw)) {
    return { suggestions: raw as AddressLocatorSuggestion[] };
  }
  if (typeof raw === 'object') {
    return raw as AddressLocatorsResponse;
  }
  return {};
}

async function propertyGet<T>(url: string, config?: Parameters<typeof apiAxiosInstance.get>[1]): Promise<T> {
  const { data: body } = await apiAxiosInstance.get<unknown>(url, config);
  return unwrapPropertyApiResponse<T>(body);
}

export const propertyService = {
  async getDemographics(params: DemographicsParams): Promise<DemographicsResponse> {
    const { state, suburb, postcode } = params;
    const query: Record<string, string> = {
      state,
      suburb,
    };
    if (postcode != null && postcode.trim() !== '') {
      query.postcode = postcode.trim();
    }
    const data = await propertyGet<unknown>('propertylocation/demographics', { params: query });
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
      return data as DemographicsResponse;
    }
    return {};
  },

  async getSalesResultsHead(): Promise<unknown> {
    return propertyGet<unknown>('propertylocation/sales-results/head');
  },

  async getSalesResults(city: string): Promise<SalesResultsResponse> {
    const raw = await propertyGet<unknown>(
      `propertylocation/sales-results/${encodeURIComponent(city)}`
    );
    return normalizeSalesResultsPayload(raw);
  },

  async getCityListings(city: string): Promise<SalesResultsResponse> {
    const raw = await propertyGet<unknown>(
      `propertylocation/sales-results/${encodeURIComponent(city)}/listings`
    );
    return normalizeSalesResultsPayload(raw);
  },

  async getPropertyById(id: string): Promise<PropertyResponse> {
    const raw = await propertyGet<unknown>(
      `propertylocation/property/${encodeURIComponent(id)}`
    );
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as PropertyResponse;
    }
    return {};
  },

  async getSuburbPerformance(state: string, suburb: string): Promise<SuburbPerformanceResponse> {
    const raw = await propertyGet<unknown>('propertylocation/suburb-performance', {
      params: { state, suburb },
    });
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as SuburbPerformanceResponse;
    }
    return {};
  },

  async getSuburbPerformanceByPostcode(
    state: string,
    suburb: string,
    postcode: string
  ): Promise<SuburbPerformanceResponse> {
    const raw = await propertyGet<unknown>('propertylocation/suburb-performance-postcode', {
      params: { state, suburb, postcode },
    });
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as SuburbPerformanceResponse;
    }
    return {};
  },

  async getLocationProfile(domainLocationId: string): Promise<LocationProfileResponse> {
    const raw = await propertyGet<unknown>(
      `propertylocation/location-profile/${encodeURIComponent(domainLocationId)}`
    );
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as LocationProfileResponse;
    }
    return {};
  },

  async searchAddressLocators(searchText: string): Promise<AddressLocatorsResponse> {
    const raw = await propertyGet<unknown>('propertylocation/address-locators', {
      params: { [ADDRESS_LOCATOR_SEARCH_PARAM]: searchText },
    });
    return normalizeAddressLocatorsPayload(raw);
  },

  /** Domain disclaimers payload (dynamic JSON). */
  async getDisclaimers(): Promise<unknown> {
    return propertyGet<unknown>('propertylocation/disclaimers');
  },

  async getDisclaimersByProduct(product: string): Promise<unknown> {
    return propertyGet<unknown>(
      `propertylocation/disclaimers/product/${encodeURIComponent(product)}`
    );
  },
};
