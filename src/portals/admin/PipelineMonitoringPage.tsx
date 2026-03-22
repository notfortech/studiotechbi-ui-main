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
  CircularProgress,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { getJobs, type Job } from '../../services/jobService';
import { getClients, type Client } from '../../services/clientService';

export const PipelineMonitoringPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await getJobs({ limit: 100, status: statusFilter === 'all' ? undefined : (statusFilter as 'failed' | 'success') });
      setJobs(res);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  useEffect(() => {
    getClients().then((c) => setClients(Array.isArray(c) ? c : []));
  }, []);

  const filtered = jobs.filter((j) => {
    if (clientFilter && j.clientId !== clientFilter) return false;
    if (dateFrom && j.createdAt && new Date(j.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && j.createdAt && new Date(j.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pipeline Monitoring
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pipeline runs, status, duration and errors
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Tenant / Client</InputLabel>
          <Select value={clientFilter} label="Tenant / Client" onChange={(e) => setClientFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {clients.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="contained" startIcon={<Search />} onClick={loadJobs}>
          Apply
        </Button>
      </Paper>

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
                  <TableCell>Pipeline / Job</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Errors</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }} color="text.secondary">
                      No pipeline runs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((j) => (
                    <TableRow key={j.id} hover>
                      <TableCell>{j.fileName ?? j.id}</TableCell>
                      <TableCell>{j.clientName ?? j.clientId ?? '—'}</TableCell>
                      <TableCell>
                        <Chip label={j.status ?? '—'} size="small" color={j.status === 'failed' ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>{j.errorMessage ?? '—'}</TableCell>
                      <TableCell>{formatDate(j.createdAt)}</TableCell>
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
