import { Box, Typography, Paper, Grid } from '@mui/material';

export const ProfilePage = () => {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Personal Information
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
              <Typography>Profile Form Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: '300px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Account Settings
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
              <Typography>Settings Form Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
