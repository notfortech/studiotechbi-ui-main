import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Replay } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { getJobs, retryJob, type Job, type JobStatusFilter } from '../../services/jobService';

export const ProcessingJobsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobStatusFilter>('all');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadJobs = async () => {
    try {
      setLoading(true);
      const list = await getJobs({ status: filter });
      setJobs(list);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load jobs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId);
      await loadJobs();
      setSnackbar({ open: true, message: 'Job retry requested', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Retry failed', severity: 'error' });
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Processing Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and retry processing jobs
        </Typography>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs value={filter} onChange={(_, v: JobStatusFilter) => setFilter(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="All" value="all" />
          <Tab label="Failed" value="failed" />
          <Tab label="Success" value="success" />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Error Message</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }} color="text.secondary">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>{job.clientName ?? job.clientId ?? '—'}</TableCell>
                      <TableCell>{job.fileName ?? '—'}</TableCell>
                      <TableCell>{job.status ?? '—'}</TableCell>
                      <TableCell>{formatDate(job.createdAt)}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>{job.errorMessage ?? '—'}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<Replay />}
                          onClick={() => handleRetry(job.id)}
                        >
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
