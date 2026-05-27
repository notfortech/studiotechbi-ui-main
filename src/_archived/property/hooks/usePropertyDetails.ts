import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function usePropertyDetails(id: string) {
  const trimmed = id.trim();
  return useQuery({
    queryKey: propertyQueryKeys.propertyDetails(trimmed),
    queryFn: () => propertyService.getPropertyById(trimmed),
    enabled: trimmed.length > 0,
  });
}
