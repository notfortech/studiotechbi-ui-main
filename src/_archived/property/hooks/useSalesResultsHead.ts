import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useSalesResultsHead(enabled = false) {
  return useQuery({
    queryKey: propertyQueryKeys.salesResultsHead(),
    queryFn: () => propertyService.getSalesResultsHead(),
    enabled,
  });
}
