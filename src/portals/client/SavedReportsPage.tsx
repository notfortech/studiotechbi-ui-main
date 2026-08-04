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
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArchiveOutlined as ArchiveIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listSavedReports,
  archiveSavedReport,
  type SavedReportSummary,
} from '../../api/savedReportsApi';
import { ROUTES } from '../../core/constants';

const sourceLabel = (sourceType: SavedReportSummary['sourceType']) =>
  sourceType === 'PowerBiRequestFulfilled' ? 'Custom Power BI' : 'Interactive Report';

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const SavedReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const items = await listSavedReports();
      setReports(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleArchive = async (e: React.MouseEvent, savedReportId: string) => {
    e.stopPropagation();
    setArchivingId(savedReportId);
    try {
      await archiveSavedReport(savedReportId);
      setReports((prev) => prev.filter((r) => r.savedReportId !== savedReportId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove saved report.');
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Saved Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive reports you've explicitly saved from the Report Generator, plus any custom
          Power BI reports our team has built for you.
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
                  <TableCell>Title</TableCell>
                  <TableCell sx={{ width: 180 }}>Type</TableCell>
                  <TableCell sx={{ width: 200 }}>Saved</TableCell>
                  <TableCell sx={{ width: 64 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No saved reports yet.
                      </Typography>
                      <Button variant="outlined" size="small" onClick={() => navigate(ROUTES.CLIENT.REPORT_GENERATOR)}>
                        Generate a report
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((r) => (
                    <TableRow
                      key={r.savedReportId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(ROUTES.CLIENT.SAVED_REPORT_DETAIL.replace(':savedReportId', r.savedReportId))}
                    >
                      <TableCell>{r.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={sourceLabel(r.sourceType)}
                          size="small"
                          color={r.sourceType === 'PowerBiRequestFulfilled' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Tooltip title="Remove">
                          <span>
                            <IconButton
                              size="small"
                              disabled={archivingId === r.savedReportId}
                              onClick={(e) => void handleArchive(e, r.savedReportId)}
                            >
                              {archivingId === r.savedReportId ? <CircularProgress size={18} /> : <ArchiveIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
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
