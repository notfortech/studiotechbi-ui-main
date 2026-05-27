import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useDisclaimersByProduct(product: string) {
  const trimmed = product.trim();
  return useQuery({
    queryKey: propertyQueryKeys.disclaimersByProduct(trimmed),
    queryFn: () => propertyService.getDisclaimersByProduct(trimmed),
    enabled: trimmed.length > 0,
  });
}
