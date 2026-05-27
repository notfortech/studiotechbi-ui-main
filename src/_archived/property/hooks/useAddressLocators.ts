import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

const MIN_SEARCH_LEN = 2;

export function useAddressLocators(searchText: string) {
  const trimmed = searchText.trim();
  return useQuery({
    queryKey: propertyQueryKeys.addressLocators(trimmed),
    queryFn: () => propertyService.searchAddressLocators(trimmed),
    enabled: trimmed.length >= MIN_SEARCH_LEN,
  });
}
