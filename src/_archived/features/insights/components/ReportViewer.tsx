import { Box, Typography } from '@mui/material';
import type { InsightReport } from '../types';

interface ReportViewerProps {
  report: InsightReport;
}

export function ReportViewer({ report }: ReportViewerProps) {
  if (!report.embedUrl) {
    return (
      <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {report.reportId
            ? 'Report is ready, but no embed URL was returned. Check the API response.'
            : 'No report to display yet.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.100',
      }}
    >
      <iframe
        title="Power BI report"
        src={report.embedUrl}
        style={{ width: '100%', height: '600px', border: 'none' }}
        allow="fullscreen"
      />
    </Box>
  );
}
