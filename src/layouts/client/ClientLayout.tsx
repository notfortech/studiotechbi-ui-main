import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { ClientTopBar } from './ClientTopBar';
import { ClientSidebar } from './ClientSidebar';
import { ClientViewProvider } from './ClientViewContext';
import { useResponsiveDrawer } from '../../hooks/useResponsiveDrawer';

export const ClientLayout = () => {
  const { isMobile, open, toggle, close } = useResponsiveDrawer();

  return (
    <ClientViewProvider>
      <Box sx={{ display: 'flex', width: '100%' }}>
        <ClientTopBar open={open} isMobile={isMobile} onToggleDrawer={toggle} />
        <ClientSidebar open={open} isMobile={isMobile} onClose={close} />
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
          }}
        >
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
    </ClientViewProvider>
  );
};
