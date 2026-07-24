import { Box, Typography } from '@mui/material';
import { NAVY, BRASS } from '../../theme';
import type { ClientBranding } from '../../core/clientBranding';

// "Blueprint Grid" -- one tall panel and two stacked side panels, the
// asymmetric layout every generated report actually has, not an abstract
// bar chart. The four-point spark in the top corner is the one concrete
// nod to "generated" rather than "hand-built." Chunky shapes hold up
// cleanly down to favicon size.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 40 40"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="10" fill={NAVY[700]} />
      <rect x="7" y="7" width="15" height="26" rx="2.2" fill={BRASS[300]} />
      <rect x="24" y="7" width="9" height="11" rx="2" fill={BRASS[400]} />
      <rect x="24" y="20" width="9" height="13" rx="2" fill={BRASS[500]} />
      <path d="M18.5 5.2 L19.9 8.4 L23.1 9.8 L19.9 11.2 L18.5 14.4 L17.1 11.2 L13.9 9.8 L17.1 8.4 Z" fill={BRASS[100]} />
    </Box>
  );
}

// Two-tone wordmark -- "StudioTech" in the surrounding text colour, "BI"
// picked out in brass, the same device the macrocoats.in reference uses
// for its own name (MACRO in ink, COATS in red).
//
// `branding`, when present (premium white-label tier), replaces the mark
// and wordmark with the client's own logo + company name -- everywhere
// this component is used inside an authenticated session picks it up
// automatically, with no per-screen changes needed once a real branding
// source exists.
export function Logo({
  size = 40,
  textColor = '#FFFFFF',
  tagline,
  branding,
}: {
  size?: number;
  textColor?: string;
  tagline?: string;
  branding?: ClientBranding | null;
}) {
  if (branding) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src={branding.logoUrl}
          alt={branding.companyName}
          sx={{ width: size, height: size, objectFit: 'contain', borderRadius: 1.5, flexShrink: 0 }}
        />
        <Typography
          sx={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontWeight: 700,
            fontSize: size * 0.5,
            lineHeight: 1.1,
            color: textColor,
          }}
        >
          {branding.companyName}
        </Typography>
      </Box>
    );
  }

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
