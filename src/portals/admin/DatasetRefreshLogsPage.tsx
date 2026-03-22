import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface RefreshLogRow {
  id: string;
  tenantId?: string;
  tenantName?: string;
  datasetId?: string;
  datasetName?: string;
  refreshTime?: string;
  status?: 'Success' | 'Failed';
  errorMessage?: string;
}

async function fetchRefreshLogs(): Promise<RefreshLogRow[]> {
  try {
    const data = await apiService.get<RefreshLogRow[] | { items: RefreshLogRow[] }>('/admin/dataset-refresh-logs');
    return Array.isArray(data) ? data : (data as { items: RefreshLogRow[] }).items ?? [];
  } catch {
    return [];
  }
}

export const DatasetRefreshLogsPage = () => {
  const [rows, setRows] = useState<RefreshLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRefreshLogs()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Dataset Refresh Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Dataset refresh history and success / failure
        </Typography>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Dataset</TableCell>
                  <TableCell>Refresh Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="text.secondary">
                      No dataset refresh logs. Connect GET /admin/dataset-refresh-logs when available.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.tenantName ?? r.tenantId ?? '—'}</TableCell>
                      <TableCell>{r.datasetName ?? r.datasetId ?? '—'}</TableCell>
                      <TableCell>{formatDate(r.refreshTime)}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status ?? '—'}
                          size="small"
                          color={r.status === 'Failed' ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>{r.errorMessage ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
