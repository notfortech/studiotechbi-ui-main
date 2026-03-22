import { Box, Toolbar } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminTopBar } from './AdminTopBar';
import { AdminSidebar } from './AdminSidebar';
import { DRAWER_WIDTH } from '../../core/constants';

export const AdminLayout = () => {
  const [open, setOpen] = useState(true);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AdminTopBar open={open} onToggleDrawer={handleDrawerToggle} />
      <AdminSidebar open={open} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: (theme) =>
            theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          marginLeft: open ? 0 : `-${DRAWER_WIDTH}px`,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
