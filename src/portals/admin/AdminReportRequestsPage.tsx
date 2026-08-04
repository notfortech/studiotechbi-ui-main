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
import { useNavigate } from 'react-router-dom';
import {
  listReportRequests,
  type CustomReportRequestSummary,
  type CustomReportRequestStatus,
} from '../../api/adminReportRequestsApi';
import { ROUTES } from '../../core/constants';

type StatusDisplay = { label: string; color: 'success' | 'error' | 'warning' | 'default' };

const statusFor = (status: CustomReportRequestStatus): StatusDisplay => {
  switch (status) {
    case 'Fulfilled':
      return { label: 'Fulfilled', color: 'success' };
    case 'InProgress':
      return { label: 'In Progress', color: 'warning' };
    case 'Declined':
      return { label: 'Declined', color: 'error' };
    case 'Pending':
    default:
      return { label: 'Pending', color: 'default' };
  }
};

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const AdminReportRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CustomReportRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await listReportRequests();
        if (!cancelled) setRequests(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report requests.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Custom Power BI Report Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Clients who didn't get a confident template match and asked for a custom Power BI
          report to be built by hand. Each request carries the client's schema snapshot.
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
                  <TableCell sx={{ width: 130 }}>Status</TableCell>
                  <TableCell>Requested By</TableCell>
                  <TableCell>Source File</TableCell>
                  <TableCell sx={{ width: 200 }}>Requested</TableCell>
                  <TableCell sx={{ width: 200 }}>Fulfilled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }} color="text.secondary">
                      No custom report requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => {
                    const status = statusFor(r.status);
                    return (
                      <TableRow
                        key={r.requestId}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(ROUTES.ADMIN.REPORT_REQUEST_DETAIL.replace(':requestId', r.requestId))}
                      >
                        <TableCell>
                          <Chip label={status.label} size="small" color={status.color === 'default' ? undefined : status.color} />
                        </TableCell>
                        <TableCell>{r.requestedByEmail ?? '—'}</TableCell>
                        <TableCell>{r.sourceFileName ?? '—'}</TableCell>
                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                        <TableCell>{formatDate(r.fulfilledAtUtc)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
