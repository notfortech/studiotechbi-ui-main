import { Box, Button, Stack, Typography } from '@mui/material';
import { connectDataSource } from '../services/insightService';

const SOURCES: { type: string; label: string }[] = [
  { type: 'onedrive', label: 'Connect OneDrive' },
  { type: 'sharepoint', label: 'Connect SharePoint' },
  { type: 'database', label: 'Connect Database' },
];

export function DataSourceConnector() {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Add a data source
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        {SOURCES.map(({ type, label }) => (
          <Button key={type} variant="outlined" size="small" onClick={() => connectDataSource(type)}>
            {label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
