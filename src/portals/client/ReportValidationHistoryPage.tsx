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
import { useNavigate } from 'react-router-dom';
import {
  listReportValidationRuns,
  type ReportValidationRunSummary,
  type ReportValidationCheckStatus,
} from '../../api/reportValidationApi';
import { ROUTES } from '../../core/constants';

type StatusDisplay = { label: string; color: 'success' | 'error' | 'warning' | 'default' };

const statusFor = (overallResult: ReportValidationCheckStatus | null | undefined, runStatus: string): StatusDisplay => {
  if (runStatus === 'Pending' || runStatus === 'Processing') {
    return { label: 'Running…', color: 'default' };
  }
  if (runStatus === 'Failed') {
    return { label: 'Failed', color: 'error' };
  }
  switch (overallResult) {
    case 'Pass':
      return { label: 'Pass', color: 'success' };
    case 'Warning':
      return { label: 'Warning', color: 'warning' };
    case 'Fail':
      return { label: 'Fail', color: 'error' };
    case 'Error':
      return { label: 'Error', color: 'error' };
    default:
      return { label: 'Unknown', color: 'default' };
  }
};

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const ReportValidationHistoryPage = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<ReportValidationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const page = await listReportValidationRuns();
        if (!cancelled) setRuns(page.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report validation history.');
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
          Report Validation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Past "Validate Report" runs — rendering health and data sanity checks confirming a
          generated report is trustworthy.
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
                  <TableCell sx={{ width: 110 }}>Result</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell sx={{ width: 200 }}>Requested</TableCell>
                  <TableCell sx={{ width: 200 }}>Completed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No report validation runs yet.
                      </Typography>
                      <Button variant="outlined" size="small" onClick={() => navigate(ROUTES.CLIENT.REPORT_GENERATOR)}>
                        Validate a report
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => {
                    const status = statusFor(run.overallResult, run.status);
                    return (
                      <TableRow
                        key={run.runId}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(ROUTES.CLIENT.REPORT_VALIDATION_RUN.replace(':runId', run.runId))}
                      >
                        <TableCell>
                          <Chip label={status.label} size="small" color={status.color === 'default' ? undefined : status.color} />
                        </TableCell>
                        <TableCell>{run.templateName ?? '—'}</TableCell>
                        <TableCell>{formatDate(run.createdAt)}</TableCell>
                        <TableCell>{formatDate(run.completedAt)}</TableCell>
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
