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
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getDashboardTemplateLogs, type FunctionalLogEntry } from '../../services/logService';

export const DashboardTemplateLogsPage = () => {
  const [logs, setLogs] = useState<FunctionalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await getDashboardTemplateLogs();
        if (!cancelled) setLogs(list);
      } catch {
        if (!cancelled) setError('Failed to load dashboard template logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');
  const isFailure = (eventType?: string) => eventType === 'DashboardTemplateGenerationFailed';

  if (error) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Dashboard Template Logs
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Dashboard Template Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Every Dashboard Template Generator run — provenance (uploaded vs. mocked data), visual
          generation notes, and deploy outcome, per client.
        </Typography>
      </Box>

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
                  <TableCell sx={{ width: 110 }}>Status</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell sx={{ width: 200 }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }} color="text.secondary">
                      No dashboard template generations yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
                    <TableRow key={(log as { id?: string }).id ?? idx} hover>
                      <TableCell>
                        <Chip
                          label={isFailure(log.eventType) ? 'Failed' : 'Success'}
                          size="small"
                          color={isFailure(log.eventType) ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}
                        >
                          {log.description ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
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
