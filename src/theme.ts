import { createTheme, alpha } from '@mui/material';

// Design language: ink navy + brass, drawn from the ledger/private-advisory
// world this product actually serves (AU/NZ accounting firms and their
// clients) rather than a generic indigo/teal SaaS palette. Navy carries
// structure and authority; brass is spent sparingly, on the things that
// deserve attention (primary actions, active state, key figures).

const NAVY = {
  900: '#0D1526',
  800: '#101B30',
  700: '#16233E',
  600: '#1F2E4E',
  500: '#3C4E72',
  100: '#E7EAF1',
};

const BRASS = {
  700: '#8F6427',
  600: '#A9762E',
  500: '#B8863B',
  400: '#C99C55',
  300: '#D4AA6A',
  100: '#F3E7D2',
};

const INK_TEXT = '#171B24';
const SLATE_TEXT = '#5B6472';
const PAPER_BG = '#F6F7F8';
const DIVIDER = '#E3E6EA';

// Two-accent emphasis system, used for italic serif "highlight" spans in
// headlines and for the big numerals on stat/metric tiles — NOT the app's
// primary palette, spent narrowly and meaningfully. These are the exact
// same hexes TrustBadge already uses for "ai" (violet) and "deterministic"
// (blue), so an italic blue word in a headline and the blue trust badge
// both mean the same thing: a real, deterministic figure.
export const ACCENT_BLUE = '#1668A0';
export const ACCENT_VIOLET = '#6B5CE7';

// Warm off-white used for surfaces that would otherwise be stark white --
// the sign-in card body, and anywhere else that wants a section-to-section
// shift away from the app's usual cool paper background.
export const CREAM = '#FAF6EC';

export { NAVY, BRASS, INK_TEXT, SLATE_TEXT, DIVIDER };

export const theme = createTheme({
  palette: {
    primary: {
      main: NAVY[700],
      dark: NAVY[900],
      light: NAVY[500],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: BRASS[500],
      dark: BRASS[700],
      light: BRASS[300],
      contrastText: '#1A1204',
    },
    background: {
      default: PAPER_BG,
      paper: '#FFFFFF',
    },
    text: {
      primary: INK_TEXT,
      secondary: SLATE_TEXT,
    },
    divider: DIVIDER,
    success: { main: '#2F7A52' },
    warning: { main: '#C08A2E' },
    error: { main: '#B23B3B' },
    info: { main: '#3C6E9E' },
  },

  shape: {
    borderRadius: 6,
  },

  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: '"Newsreader", Georgia, serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h2: { fontFamily: '"Newsreader", Georgia, serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontFamily: '"Newsreader", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Newsreader", Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: '"Newsreader", Georgia, serif', fontWeight: 600 },
    h6: { fontWeight: 700, letterSpacing: '0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
    overline: { fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.08em', fontWeight: 600 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(NAVY[700], 0.28)} transparent`,
        },
        '*::-webkit-scrollbar': { width: 9, height: 9 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          background: alpha(NAVY[700], 0.22),
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: alpha(NAVY[700], 0.38),
          backgroundClip: 'content-box',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999,
          paddingInline: 22,
          paddingBlock: 9,
        },
        sizeSmall: {
          paddingInline: 16,
          paddingBlock: 6,
        },
        containedPrimary: {
          boxShadow: `0 1px 2px ${alpha(NAVY[900], 0.1)}, 0 6px 14px ${alpha(NAVY[900], 0.14)}`,
          '&:hover': {
            boxShadow: `0 2px 4px ${alpha(NAVY[900], 0.14)}, 0 10px 20px ${alpha(NAVY[900], 0.18)}`,
          },
        },
        outlined: {
          borderColor: DIVIDER,
          '&:hover': {
            borderColor: NAVY[700],
            backgroundColor: alpha(NAVY[700], 0.04),
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow: `0 1px 2px ${alpha(NAVY[900], 0.04)}, 0 6px 18px ${alpha(NAVY[900], 0.05)}`,
        },
        elevation2: {
          boxShadow: `0 1px 2px ${alpha(NAVY[900], 0.05)}, 0 10px 24px ${alpha(NAVY[900], 0.07)}`,
        },
        outlined: {
          borderColor: DIVIDER,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
        },
      },
    },

    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:hover': {
            '& .MuiCardContent-root': { backgroundColor: alpha(NAVY[700], 0.02) },
          },
        },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: NAVY[700],
          backgroundImage: `linear-gradient(180deg, ${NAVY[600]}, ${NAVY[700]})`,
          borderBottom: `1px solid ${NAVY[900]}`,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: NAVY[800],
          backgroundImage: `linear-gradient(180deg, ${NAVY[800]}, ${NAVY[900]})`,
          borderRight: `1px solid ${NAVY[900]}`,
          color: alpha('#FFFFFF', 0.86),
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: SLATE_TEXT,
          borderBottom: `1px solid ${DIVIDER}`,
        },
        body: {
          borderBottom: `1px solid ${DIVIDER}`,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: NAVY[900],
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 6,
          padding: '8px 12px',
          boxShadow: `0 8px 24px ${alpha(NAVY[900], 0.35)}`,
        },
        arrow: { color: NAVY[900] },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: alpha(NAVY[700], 0.08),
        },
        bar: { borderRadius: 8 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: BRASS[500],
            borderWidth: 1.5,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': { color: BRASS[600] },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: BRASS[500], height: 2.5 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: NAVY[700] },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: BRASS[500] },
          '&.Mui-completed': { color: NAVY[700] },
        },
      },
    },
  },
});
