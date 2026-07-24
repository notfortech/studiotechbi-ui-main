import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { ACCENT_BLUE, ACCENT_VIOLET, BRASS } from '../../theme';

// The "PROCESS / PHOSPHATING… pH 3.2 · 48°C" pattern: a small uppercase
// label, one big serif number, a small caption underneath. Replaces the
// generic coloured-avatar-plus-two-lines KPI card with something that
// reads like a real figure worth noticing, not a template widget.
export function MetricTile({
  label,
  value,
  caption,
  accent = 'blue',
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  accent?: 'blue' | 'violet' | 'brass';
}) {
  const color = accent === 'violet' ? ACCENT_VIOLET : accent === 'brass' ? BRASS[600] : ACCENT_BLUE;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.25,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontWeight: 700,
          fontSize: 30,
          lineHeight: 1.15,
          color,
          mt: 0.5,
        }}
      >
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
