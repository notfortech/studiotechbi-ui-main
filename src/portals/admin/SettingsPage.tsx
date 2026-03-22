import { Box, Typography, Paper, Grid } from '@mui/material';

export const SettingsPage = () => {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure system-wide settings and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              General Settings
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
              <Typography>General Settings Form Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Security Settings
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
              <Typography>Security Settings Form Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
