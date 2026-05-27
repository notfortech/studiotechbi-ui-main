import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { lazy, Suspense, useEffect, useState } from 'react';
import { usePortalDashboard } from '../../hooks/usePortalDashboard';

const PortalDashboardPanel = lazy(() =>
  import('../../components/dashboard/PortalDashboardPanel').then((m) => ({
    default: m.PortalDashboardPanel,
  }))
);
import { getAccountantClients, type AccountantClient } from '../../services/reportService';

export const AccountantDashboard = () => {
  const [months, setMonths] = useState(6);
  const [clients, setClients] = useState<AccountantClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  /** Empty string = firm overview (omit clientId); otherwise Guid for GET /api/dashboard?clientId= */
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setClientsLoading(true);
        const list = await getAccountantClients();
        if (!cancelled) setClients(list);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, loading, error, forbidden } = usePortalDashboard(
    months,
    selectedClientId || undefined,
    { onForbidden: () => setSelectedClientId('') }
  );

  const clientFilter = (
    <Box sx={{ mb: 2, maxWidth: 400 }}>
      <FormControl fullWidth size="small" disabled={clientsLoading}>
        <InputLabel>Client</InputLabel>
        <Select
          label="Client"
          value={selectedClientId}
          onChange={(e: SelectChangeEvent<string>) => setSelectedClientId(e.target.value)}
        >
          <MenuItem value="">
            <em>All accessible clients (firm overview)</em>
          </MenuItem>
          {clients.map((c) => (
            <MenuItem key={c.clientId} value={c.clientId}>
              {c.clientName || c.clientCode} ({c.clientCode})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

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
        clientFilter={clientFilter}
        hasSelectedClient={!!selectedClientId}
      />
    </Suspense>
  );
};
