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
  CircularProgress,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

export interface PowerBIAssetRow {
  id: string;
  tenantId?: string;
  tenantName?: string;
  workspaceId?: string;
  datasetId?: string;
  reportId?: string;
  capacityId?: string;
}

/** Backend may expose GET /admin/powerbi-assets or similar; until then we try and fallback to empty */
async function fetchPowerBIAssets(): Promise<PowerBIAssetRow[]> {
  try {
    const data = await apiService.get<PowerBIAssetRow[] | { items: PowerBIAssetRow[] }>('/admin/powerbi-assets');
    return Array.isArray(data) ? data : (data as { items: PowerBIAssetRow[] }).items ?? [];
  } catch {
    return [];
  }
}

export const PowerBIAssetsPage = () => {
  const [rows, setRows] = useState<PowerBIAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPowerBIAssets()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load Power BI assets');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Power BI Assets
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Workspace, Dataset, Report and Capacity IDs per tenant
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Workspace</TableCell>
                  <TableCell>Dataset</TableCell>
                  <TableCell>Report</TableCell>
                  <TableCell>Capacity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="text.secondary">
                      No Power BI assets configured. Connect your API or add assets via backend.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.tenantName ?? r.tenantId ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.workspaceId ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.datasetId ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.reportId ?? '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.capacityId ?? '—'}</TableCell>
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
