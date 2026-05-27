import { useQuery } from '@tanstack/react-query';
import type { DemographicsParams } from '../../services/property/propertyService';
import { propertyService } from '../../services/property/propertyService';
import { propertyQueryKeys } from './queryKeys';

export function useDemographics(params: DemographicsParams | null) {
  const state = params?.state?.trim() ?? '';
  const suburb = params?.suburb?.trim() ?? '';
  const postcode = params?.postcode?.trim() ?? '';
  const enabled = state.length > 0 && suburb.length > 0;

  return useQuery({
    queryKey: propertyQueryKeys.demographics(state, suburb, postcode),
    queryFn: () =>
      propertyService.getDemographics({
        state,
        suburb,
        postcode: postcode || undefined,
      }),
    enabled,
  });
}
