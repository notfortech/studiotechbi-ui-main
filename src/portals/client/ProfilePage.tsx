import { Box, Typography, Paper, Grid, Stack, Chip, TextField, Button } from '@mui/material';
import { Lock as LockIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { Eyebrow } from '../../components/common/Eyebrow';

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

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Eyebrow>Branding</Eyebrow>
              <Chip
                icon={<LockIcon sx={{ fontSize: 14 }} />}
                label="Premium plan"
                size="small"
                sx={{ bgcolor: 'secondary.light', color: '#1A1204', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              White-Label Branding
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
              Replace StudioTechBI's logo and name across your portal, login screen, and reports with
              your own. Available on Premium and above — contact your account manager to upgrade.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={5}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Company Logo</Typography>
                <Box
                  sx={{
                    border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                    p: 3, textAlign: 'center', bgcolor: 'action.hover', opacity: 0.6,
                  }}
                >
                  <Stack alignItems="center" spacing={1}>
                    <UploadIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                      Upload a logo (unlocks on Premium)
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} sm={7}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Company Name</Typography>
                <TextField
                  fullWidth
                  size="small"
                  disabled
                  placeholder="e.g. Acme Advisory Group"
                  sx={{ mb: 2 }}
                />
                <Button variant="outlined" disabled size="small">
                  Save branding
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
