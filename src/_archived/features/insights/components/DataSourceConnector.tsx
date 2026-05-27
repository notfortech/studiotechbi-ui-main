import { Box, Typography } from '@mui/material';

/**
 * Insights is limited to the report dataset in storage—no user-managed external connectors in this view.
 */
export function DataSourceConnector() {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Report dataset (sample)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
        Insights shows a sample of your data from report storage in tabular, Excel-style form. Other data
        sources cannot be connected here; only the report dataset is used.
      </Typography>
    </Box>
  );
}
