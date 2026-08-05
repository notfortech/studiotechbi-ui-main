import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AdminTopBar } from './AdminTopBar';
import { AdminSidebar } from './AdminSidebar';
import { DRAWER_WIDTH } from '../../core/constants';
import { useResponsiveDrawer } from '../../hooks/useResponsiveDrawer';

export const AdminLayout = () => {
  const { isMobile, open, toggle, close } = useResponsiveDrawer();

  return (
    <Box sx={{ display: 'flex' }}>
      <AdminTopBar open={open} isMobile={isMobile} onToggleDrawer={toggle} />
      <AdminSidebar open={open} isMobile={isMobile} onClose={close} />
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
          marginLeft: !isMobile && !open ? `-${DRAWER_WIDTH}px` : 0,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
