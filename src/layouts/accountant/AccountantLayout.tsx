import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AccountantTopBar } from './AccountantTopBar';
import { AccountantSidebar } from './AccountantSidebar';
import { DRAWER_WIDTH } from '../../core/constants';
import { useResponsiveDrawer } from '../../hooks/useResponsiveDrawer';

export const AccountantLayout = () => {
  const { isMobile, open, toggle, close } = useResponsiveDrawer();

  return (
    <Box sx={{ display: 'flex' }}>
      <AccountantTopBar open={open} isMobile={isMobile} onToggleDrawer={toggle} />
      <AccountantSidebar open={open} isMobile={isMobile} onClose={close} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: '100%',
          p: { xs: 2, sm: 3 },
          transition: (theme) =>
            theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          // Only push content over on desktop, where the drawer is persistent (part of normal
          // flex flow); on mobile the drawer overlays instead, so content always stays full width.
          marginLeft: !isMobile && !open ? `-${DRAWER_WIDTH}px` : 0,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
