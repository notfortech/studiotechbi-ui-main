import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { getClients, type Client } from '../../services/clientService';
import { apiService } from '../../services/api';

interface UploadRow {
  id: string;
  tenantId?: string;
  tenantName?: string;
  fileName?: string;
  uploadedAt?: string;
  status?: string;
  schemaValidationErrors?: string;
}

async function fetchUploads(): Promise<UploadRow[]> {
  try {
    const data = await apiService.get<UploadRow[] | { items: UploadRow[] }>('/admin/file-uploads');
    return Array.isArray(data) ? data : (data as { items: UploadRow[] }).items ?? [];
  } catch {
    return [];
  }
}

export const FileUploadMonitoringPage = () => {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchUploads().then((data) => {
      if (!cancelled) setRows(data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    getClients().then((c) => setClients(Array.isArray(c) ? c : []));
    return () => { cancelled = true; };
  }, []);

  const filtered = tenantFilter ? rows.filter((r) => r.tenantId === tenantFilter) : rows;

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          File Upload Monitoring
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Client uploads, processing status and schema validation errors
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tenant / Client</InputLabel>
          <Select value={tenantFilter} label="Tenant / Client" onChange={(e) => setTenantFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {clients.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<Search />} onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Uploaded At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Schema validation errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="text.secondary">
                      No file uploads found. Backend may expose GET /admin/file-uploads.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.tenantName ?? r.tenantId ?? '—'}</TableCell>
                      <TableCell>{r.fileName ?? '—'}</TableCell>
                      <TableCell>{formatDate(r.uploadedAt)}</TableCell>
                      <TableCell><Chip label={r.status ?? '—'} size="small" /></TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>{r.schemaValidationErrors ?? '—'}</TableCell>
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
