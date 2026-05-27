import { Box, CircularProgress } from '@mui/material';
import { lazy, Suspense, useState } from 'react';
import { usePortalDashboard } from '../../hooks/usePortalDashboard';

const PortalDashboardPanel = lazy(() =>
  import('../../components/dashboard/PortalDashboardPanel').then((m) => ({
    default: m.PortalDashboardPanel,
  }))
);

export const ClientDashboard = () => {
  const [months, setMonths] = useState(6);
  const { data, loading, error, forbidden } = usePortalDashboard(months, undefined);

  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      }
    >
      <PortalDashboardPanel
        months={months}
        onMonthsChange={setMonths}
        data={data}
        loading={loading}
        error={error}
        forbidden={forbidden}
        hasSelectedClient={false}
      />
    </Suspense>
  );
};
