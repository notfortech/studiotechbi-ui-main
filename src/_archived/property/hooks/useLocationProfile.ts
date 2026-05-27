import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useLocationProfile(domainLocationId: string) {
  const trimmed = domainLocationId.trim();
  return useQuery({
    queryKey: propertyQueryKeys.locationProfile(trimmed),
    queryFn: () => propertyService.getLocationProfile(trimmed),
    enabled: trimmed.length > 0,
  });
}
