import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useCityListings(city: string) {
  const trimmed = city.trim();
  return useQuery({
    queryKey: propertyQueryKeys.cityListings(trimmed),
    queryFn: () => propertyService.getCityListings(trimmed),
    enabled: trimmed.length > 0,
  });
}
