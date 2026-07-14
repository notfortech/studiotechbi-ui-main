import { Box, Typography } from '@mui/material';
import { NAVY, BRASS } from '../../theme';

// Ascending bars in a navy tile -- a BI/reporting mark, not a generic
// briefcase or globe icon. Bar height/shade progression is deliberate:
// reads as "growth" at any size down to a favicon.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 40 40"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="10" fill={NAVY[700]} />
      <rect x="9" y="21" width="5" height="10" rx="1.5" fill={BRASS[300]} />
      <rect x="17.5" y="15" width="5" height="16" rx="1.5" fill={BRASS[400]} />
      <rect x="26" y="9" width="5" height="22" rx="1.5" fill={BRASS[500]} />
    </Box>
  );
}

// Two-tone wordmark -- "StudioTech" in the surrounding text colour, "BI"
// picked out in brass, the same device the macrocoats.in reference uses
// for its own name (MACRO in ink, COATS in red).
export function Logo({
  size = 40,
  textColor = '#FFFFFF',
  tagline,
}: {
  size?: number;
  textColor?: string;
  tagline?: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <LogoMark size={size} />
      <Box>
        <Typography
          sx={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontWeight: 700,
            fontSize: size * 0.55,
            lineHeight: 1.1,
            color: textColor,
            letterSpacing: '-0.01em',
          }}
        >
          StudioTech
          <Box component="span" sx={{ color: BRASS[400] }}>BI</Box>
        </Typography>
        {tagline && (
          <Typography
            sx={{
              fontSize: size * 0.24,
              color: textColor,
              opacity: 0.72,
              letterSpacing: '0.02em',
              mt: 0.25,
            }}
          >
            {tagline}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
