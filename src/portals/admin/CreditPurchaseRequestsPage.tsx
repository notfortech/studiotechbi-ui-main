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
  Button,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  listCreditPurchaseRequests,
  markCreditPurchaseRequestPaid,
  type CreditPurchaseRequestSummary,
  type CreditPurchaseRequestStatus,
} from '../../api/adminCreditPurchaseRequestsApi';

type StatusDisplay = { label: string; color: 'success' | 'error' | 'warning' | 'default' };

const statusFor = (status: CreditPurchaseRequestStatus): StatusDisplay => {
  switch (status) {
    case 'Paid':
      return { label: 'Paid', color: 'success' };
    case 'Cancelled':
      return { label: 'Cancelled', color: 'error' };
    case 'Pending':
    default:
      return { label: 'Pending', color: 'default' };
  }
};

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const CreditPurchaseRequestsPage = () => {
  const [requests, setRequests] = useState<CreditPurchaseRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const items = await listCreditPurchaseRequests();
      setRequests(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit purchase requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkPaid = async (requestId: string) => {
    setMarkingId(requestId);
    setError(null);
    try {
      await markCreditPurchaseRequestPaid(requestId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark this request paid.');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Credit Purchase Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Mock-checkout AI credit purchases awaiting payment confirmation. Marking a request paid
          grants the credits immediately against the AI credit ledger.
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
                  <TableCell>Pack</TableCell>
                  <TableCell sx={{ width: 100 }}>Source</TableCell>
                  <TableCell sx={{ width: 200 }}>Requested</TableCell>
                  <TableCell sx={{ width: 200 }}>Paid</TableCell>
                  <TableCell sx={{ width: 140 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }} color="text.secondary">
                      No credit purchase requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => {
                    const status = statusFor(r.status);
                    return (
                      <TableRow key={r.requestId} hover>
                        <TableCell>
                          <Chip label={status.label} size="small" color={status.color === 'default' ? undefined : status.color} />
                        </TableCell>
                        <TableCell>{r.packLabel} ({r.creditsRequested.toLocaleString()} credits)</TableCell>
                        <TableCell>
                          {r.source === 'System' ? (
                            <Chip label="Auto (low balance)" size="small" color="info" variant="outlined" />
                          ) : (
                            'Client'
                          )}
                        </TableCell>
                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                        <TableCell>{formatDate(r.paidAtUtc)}</TableCell>
                        <TableCell>
                          {r.status === 'Pending' && (
                            <Button
                              size="small"
                              variant="contained"
                              disabled={markingId === r.requestId}
                              onClick={() => void handleMarkPaid(r.requestId)}
                            >
                              {markingId === r.requestId ? 'Marking…' : 'Mark Paid'}
                            </Button>
                          )}
                        </TableCell>
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
