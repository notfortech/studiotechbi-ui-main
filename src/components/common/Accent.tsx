import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { ACCENT_BLUE, ACCENT_VIOLET } from '../../theme';

// Italic serif emphasis span for headlines — "Chemistry, engineered to your
// process." style highlighting instead of bold or a coloured box. Colour
// carries real meaning here, not decoration: blue = a deterministic, real
// figure; violet = something AI-assisted. Matches TrustBadge's colours
// exactly, so an italic blue word and the blue trust badge always agree.
export function Accent({ children, kind = 'blue' }: { children: ReactNode; kind?: 'blue' | 'violet' }) {
  return (
    <Box
      component="em"
      sx={{
        fontStyle: 'italic',
        fontFamily: 'inherit',
        color: kind === 'violet' ? ACCENT_VIOLET : ACCENT_BLUE,
      }}
    >
      {children}
    </Box>
  );
}
