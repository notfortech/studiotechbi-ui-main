import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Assessment as ReportsIcon,
  People as ClientsIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useClientView, type ClientViewMode } from './ClientViewContext';
import { DRAWER_WIDTH } from '../../core/constants';

interface ClientTopBarProps {
  open: boolean;
  onToggleDrawer: () => void;
}

const toggleStyle = {
  '& .MuiToggleButton-root': {
    color: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(255,255,255,0.3)',
    '&.Mui-selected': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' },
  },
};

export const ClientTopBar = ({ open, onToggleDrawer }: ClientTopBarProps) => {
  const { user, logout } = useAuth();
  const {
    viewMode,
    setViewMode,
    accountingFirmMode,
    setAccountingFirmMode,
  } = useClientView();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isClientPortal = user?.role === 'client';
  /** UserType 0 = general client: hide accounting toggle and Reports/Clients tabs. */
  const canUseAccountingFirmUi = isClientPortal && user?.userType !== 0;
  const showAccountingWorkflow = canUseAccountingFirmUi && accountingFirmMode;

  const handleViewMode = (_e: React.MouseEvent<HTMLElement>, mode: ClientViewMode | null) => {
    if (mode !== null) setViewMode(mode);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        ...(open && {
          marginLeft: DRAWER_WIDTH,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onToggleDrawer}
          edge="start"
          sx={{ marginRight: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Client Portal
          {user?.clientCode && (
            <Typography component="span" variant="body2" sx={{ ml: 1.5, opacity: 0.9 }}>
              — {user.clientName || user.clientCode}
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {canUseAccountingFirmUi && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={accountingFirmMode}
                  onChange={(_, checked) => setAccountingFirmMode(checked)}
                  color="default"
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'white' } }}
                />
              }
              label={
                <Typography component="span" variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Accounting firm
                </Typography>
              }
              sx={{ mr: 0 }}
            />
          )}
          {showAccountingWorkflow && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewMode}
              aria-label="view reports or clients"
              size="small"
              sx={toggleStyle}
            >
              <ToggleButton value="reports" aria-label="reports">
                <ReportsIcon sx={{ mr: 0.5 }} fontSize="small" />
                Reports
              </ToggleButton>
              <ToggleButton value="clients" aria-label="clients">
                <ClientsIcon sx={{ mr: 0.5 }} fontSize="small" />
                Clients
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          <Typography variant="body2">{user?.name}</Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
