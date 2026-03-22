import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccountantClients, type AccountantClient } from '../../services/reportService';
import { ROUTES } from '../../core/constants';

export const AccountantClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<AccountantClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getAccountantClients();
        if (!cancelled) setClients(list);
      } catch {
        if (!cancelled) {
          setError('Failed to load clients');
          setClients([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRowClick = (client: AccountantClient) => {
    navigate(ROUTES.ACCOUNTANT.REPORTS, { state: { clientCode: client.clientCode } });
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Client Portfolio
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select a client to open their reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, minHeight: '500px' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          My Clients
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : clients.length === 0 ? (
          <Box
            sx={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography>No clients available.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Client code</TableCell>
                  <TableCell>Client name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.clientId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(client)}
                  >
                    <TableCell>{client.clientCode}</TableCell>
                    <TableCell>{client.clientName || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
