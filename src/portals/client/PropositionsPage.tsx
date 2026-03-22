import { Box, Typography, Paper } from '@mui/material';

export const PropositionsPage = () => {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Business Propositions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review proposals and recommendations from your accountant
        </Typography>
      </Box>

      <Paper sx={{ p: 3, minHeight: '500px' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Active Propositions
        </Typography>
        <Box
          sx={{
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography>Propositions List Placeholder</Typography>
        </Box>
      </Paper>
    </Box>
  );
};
