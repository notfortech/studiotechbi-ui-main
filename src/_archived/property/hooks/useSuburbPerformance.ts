import { useQuery } from '@tanstack/react-query';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export interface UseSuburbPerformanceParams {
  state: string;
  suburb: string;
  postcode?: string;
}

export function useSuburbPerformance({ state, suburb, postcode }: UseSuburbPerformanceParams) {
  const st = state.trim();
  const sub = suburb.trim();
  const pc = postcode?.trim() ?? '';
  const hasBase = st.length > 0 && sub.length > 0;
  const usePostcode = pc.length > 0;

  return useQuery({
    queryKey: usePostcode
      ? propertyQueryKeys.suburbPerformancePostcode(st, sub, pc)
      : propertyQueryKeys.suburbPerformance(st, sub),
    queryFn: () =>
      usePostcode
        ? propertyService.getSuburbPerformanceByPostcode(st, sub, pc)
        : propertyService.getSuburbPerformance(st, sub),
    enabled: hasBase,
  });
}
