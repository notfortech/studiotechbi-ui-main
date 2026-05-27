import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useSalesResults(city: string) {
  const trimmed = city.trim();
  return useQuery({
    queryKey: propertyQueryKeys.salesResults(trimmed),
    queryFn: () => propertyService.getSalesResults(trimmed),
    enabled: trimmed.length > 0,
  });
}
