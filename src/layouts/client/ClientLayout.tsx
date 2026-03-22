import { Box, Toolbar } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ClientTopBar } from './ClientTopBar';
import { ClientSidebar } from './ClientSidebar';
import { ClientViewProvider } from './ClientViewContext';
import { DRAWER_WIDTH } from '../../core/constants';

export const ClientLayout = () => {
  const [open, setOpen] = useState(true);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <ClientViewProvider>
      <Box sx={{ display: 'flex', width: '100%' }}>
        <ClientTopBar open={open} onToggleDrawer={handleDrawerToggle} />
        <ClientSidebar open={open} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            p: 3,
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
