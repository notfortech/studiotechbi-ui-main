import { Box, Toolbar } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AccountantTopBar } from './AccountantTopBar';
import { AccountantSidebar } from './AccountantSidebar';
import { DRAWER_WIDTH } from '../../core/constants';

export const AccountantLayout = () => {
  const [open, setOpen] = useState(true);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AccountantTopBar open={open} onToggleDrawer={handleDrawerToggle} />
      <AccountantSidebar open={open} />
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
