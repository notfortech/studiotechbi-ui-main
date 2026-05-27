import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useDisclaimers(enabled = false) {
  return useQuery({
    queryKey: propertyQueryKeys.disclaimers(),
    queryFn: () => propertyService.getDisclaimers(),
    enabled,
  });
}
