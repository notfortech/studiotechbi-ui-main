import { Box, Typography, Paper, CircularProgress, Alert, Button, Stack } from '@mui/material';
import { ArrowBack as BackIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSavedReport, type SavedReportDetail } from '../../api/savedReportsApi';
import { ROUTES } from '../../core/constants';

export const SavedReportDetailPage = () => {
  const navigate = useNavigate();
  const { savedReportId } = useParams<{ savedReportId: string }>();
  const [detail, setDetail] = useState<SavedReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!savedReportId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await getSavedReport(savedReportId);
        if (!cancelled) setDetail(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load saved report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savedReportId]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(ROUTES.CLIENT.SAVED_REPORTS)}>
          Saved Reports
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : detail ? (
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {detail.title}
          </Typography>

          {detail.sourceType === 'GeneratedHtml' && detail.htmlReport ? (
            <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
              <iframe
                title={detail.title}
                srcDoc={detail.htmlReport}
                sandbox="allow-scripts"
                style={{ width: '100%', height: '80vh', border: 'none' }}
                data-testid="saved-report-html-frame"
              />
            </Paper>
          ) : detail.sourceType === 'PowerBiRequestFulfilled' ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This is a custom Power BI report our analyst team built for you. Open it from your
                Reports list, where it appears alongside your other Power BI reports.
              </Typography>
              <Button
                variant="contained"
                startIcon={<OpenIcon />}
                onClick={() => navigate(ROUTES.CLIENT.REPORTS)}
              >
                Go to Reports
              </Button>
            </Paper>
          ) : (
            <Alert severity="warning">This report has no content to display.</Alert>
          )}
        </Box>
      ) : (
        <Alert severity="warning">Saved report not found.</Alert>
      )}
    </Box>
  );
};
