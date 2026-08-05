import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Persistent sidebar on desktop, overlay drawer on mobile/tablet — shared by all three portal
 * layouts (Client/Accountant/Admin). Below the `md` breakpoint (900px) a permanently-open
 * DRAWER_WIDTH (260px) sidebar would eat most of a phone's viewport, squeezing page content into
 * a narrow column; below that breakpoint this defaults the drawer closed and callers should
 * render it as a `temporary` (backdrop, auto-closing) MUI Drawer instead of `persistent`.
 */
export function useResponsiveDrawer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);

  // Re-syncs the default when crossing the breakpoint (resize, rotate) — doesn't fight a user's
  // own toggle within one size class, since `open` itself isn't a dependency here.
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  return {
    isMobile,
    open,
    toggle: () => setOpen((prev) => !prev),
    close: () => setOpen(false),
  };
}
