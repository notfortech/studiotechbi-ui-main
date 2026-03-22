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
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { getTenants, type TenantDto } from '../../services/tenantService';

interface AuditLogRow {
  id: string;
  user?: string;
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  timestamp?: string;
  ipAddress?: string;
}

async function fetchAuditLogs(params: { tenantId?: string; userId?: string; from?: string; to?: string }): Promise<AuditLogRow[]> {
  const sp = new URLSearchParams();
  if (params.tenantId) sp.set('tenantId', params.tenantId);
  if (params.userId) sp.set('userId', params.userId);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const q = sp.toString();
  try {
    const data = await apiService.get<AuditLogRow[] | { items: AuditLogRow[] }>(`/admin/audit-logs${q ? `?${q}` : ''}`);
    return Array.isArray(data) ? data : (data as { items: AuditLogRow[] }).items ?? [];
  } catch {
    return [];
  }
}

export const AuditLogsPage = () => {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    setLoading(true);
    fetchAuditLogs({
      tenantId: tenantFilter || undefined,
      userId: userFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    getTenants({ pageSize: 100 }).then((r) => setTenants(r.items));
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Audit Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          User actions, entity changes and timestamps
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Tenant</InputLabel>
          <Select value={tenantFilter} label="Tenant" onChange={(e) => setTenantFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" label="User" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="User ID or email" sx={{ minWidth: 180 }} />
        <TextField size="small" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="contained" startIcon={<Search />} onClick={load}>
          Apply
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
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="text.secondary">
                      No audit logs. Connect GET /admin/audit-logs when available.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.user ?? r.userId ?? '—'}</TableCell>
                      <TableCell>{r.action ?? '—'}</TableCell>
                      <TableCell>{r.entity ?? '—'}</TableCell>
                      <TableCell>{formatDate(r.timestamp)}</TableCell>
                      <TableCell>{r.ipAddress ?? '—'}</TableCell>
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
