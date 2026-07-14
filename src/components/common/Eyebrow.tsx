import { Stack, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

// Small uppercase label with a leading dash rule — the "— TRUSTED BY" /
// "PROCESS / PHOSPHATING" pattern. Marks a section or a data point without
// needing a heavier heading; reused above metric tiles and section intros.
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Box sx={{ width: 18, height: 1.5, bgcolor: color ?? 'text.secondary', opacity: 0.55, flexShrink: 0 }} />
      <Typography
        variant="overline"
        sx={{ color: color ?? 'text.secondary', letterSpacing: '0.12em', lineHeight: 1 }}
      >
        {children}
      </Typography>
    </Stack>
  );
}
