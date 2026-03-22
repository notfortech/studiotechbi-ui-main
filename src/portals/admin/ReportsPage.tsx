import { Box, Typography, Paper, Grid, Button, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { PowerBIEmbed } from '../client/PowerBIEmbed';
import { apiService } from '../../services/api';

interface EmbedResponse {
  accessToken: string;
  embedUrl: string;
  reportId: string;
  period?: string;
}

export const AdminReportsPage = () => {
  const [embedData, setEmbedData] = useState<EmbedResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<EmbedResponse>('/powerbi/embed-token');
      setEmbedData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage reports
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={12}>
          <Paper sx={{ p: 3, minHeight: '500px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Reports
            </Typography>
            <Box sx={{ mt: 2 }}>
              {loading && (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              )}
              {!loading && embedData && (
                <Box sx={{ height: '600px' }}>
                  <PowerBIEmbed
                    accessToken={embedData.accessToken}
                    embedUrl={embedData.embedUrl}
                    reportId={embedData.reportId}
                    // periodFolder={selectedAvailablePeriod}}
                  />
                </Box>
              )}
              {!loading && !embedData && (
                <Box
                  sx={{
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                    gap: 2,
                  }}
                >
                  <Typography>Load a Power BI report to view it here.</Typography>
                  <Button variant="contained" onClick={loadReport}>
                    Load report
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
