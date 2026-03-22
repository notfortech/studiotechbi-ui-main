import { Box, Typography, Paper, Grid } from '@mui/material';

export const InsightsPage = () => {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Financial Insights
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered financial analysis and recommendations
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Trends Analysis
            </Typography>
            <Box
              sx={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography>Trends Chart Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recommendations
            </Typography>
            <Box
              sx={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography>AI Recommendations Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
