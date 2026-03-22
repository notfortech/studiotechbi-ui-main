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
import { getFunctionalLogs, type FunctionalLogEntry } from '../../services/logService';

export const FunctionalLogsPage = () => {
  const [logs, setLogs] = useState<FunctionalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await getFunctionalLogs();
        if (!cancelled) setLogs(list);
      } catch {
        if (!cancelled) setError('Failed to load functional logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  if (error) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Functional Logs
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Functional Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Event and functional activity logs
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
                  <TableCell>Event Type</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }} color="text.secondary">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
                    <TableRow key={(log as { id?: string }).id ?? idx} hover>
                      <TableCell>{log.eventType ?? '—'}</TableCell>
                      <TableCell>{log.client ?? '—'}</TableCell>
                      <TableCell>{log.description ?? '—'}</TableCell>
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
