import { isAxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  getPortalDashboard,
  type PortalDashboardResponse,
} from '../services/userDashboardService';

export function usePortalDashboard(
  months: number,
  clientId: string | undefined,
  options?: { onForbidden?: () => void }
) {
  const [data, setData] = useState<PortalDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const onForbiddenRef = useRef(options?.onForbidden);
  onForbiddenRef.current = options?.onForbidden;

  useEffect(() => {
    let cancelled = false;
    setForbidden(false);
    setError(null);

    (async () => {
      try {
        setLoading(true);
        const res = await getPortalDashboard({
          months,
          clientId: clientId?.trim() || undefined,
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (cancelled) return;
        if (isAxiosError(e)) {
          const status = e.response?.status;
          if (status === 403) {
            setForbidden(true);
            setData(null);
            onForbiddenRef.current?.();
            return;
          }
          if (status === 401) return;
        }
        setError('Failed to load dashboard');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [months, clientId]);

  return { data, loading, error, forbidden };
}
