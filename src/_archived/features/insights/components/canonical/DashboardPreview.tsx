import { Box, Chip, Stack, Typography } from '@mui/material';
import type { DashboardDefinition } from '../../types';

export function DashboardPreview({ dashboard }: { dashboard: DashboardDefinition }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography variant="subtitle2" fontWeight={800} gutterBottom>
        Dashboard preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {dashboard.title}
      </Typography>

      <Stack spacing={1.25}>
        {(dashboard.pages ?? []).slice(0, 6).map((p) => (
          <Box key={p.title} sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="body2" fontWeight={700} gutterBottom>
              {p.title}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(p.visuals ?? []).slice(0, 8).map((v, idx) => (
                <Chip key={`${v.type}-${idx}`} size="small" label={`${v.type}${v.title ? `: ${v.title}` : ''}`} variant="outlined" />
              ))}
              {(p.visuals ?? []).length > 8 && <Chip size="small" label={`+${(p.visuals ?? []).length - 8} more`} />}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

