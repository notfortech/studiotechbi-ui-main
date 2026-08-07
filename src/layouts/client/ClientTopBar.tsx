import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  NotificationsNone,
  CheckCircle,
  ErrorOutline,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { DRAWER_WIDTH } from '../../core/constants';
import { Logo } from '../../components/common/Logo';
import { useBackgroundJobs, type BackgroundJob } from '../../contexts/BackgroundJobsContext';

interface ClientTopBarProps {
  open: boolean;
  isMobile: boolean;
  onToggleDrawer: () => void;
}

export const ClientTopBar = ({ open, isMobile, onToggleDrawer }: ClientTopBarProps) => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const { jobs, unseenCount, navigateToJob, markSeen, dismissJob } = useBackgroundJobs();

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

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationsAnchorEl(null);
  };

  const handleJobClick = (job: BackgroundJob) => {
    markSeen(job.id);
    handleCloseNotifications();
    if (job.status === 'Completed' || job.status === 'Failed') {
      navigateToJob(job);
    }
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
        ...(!isMobile && open && {
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
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {/* Always StudioTechBI's own mark -- client branding (when premium) is shown
           * prominently in the sidebar instead, not by replacing this. */}
          <Logo size={30} textColor="#FFFFFF" />
          {user?.clientCode && (
            <Typography
              component="span"
              variant="body2"
              noWrap
              sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }}
            >
              — {user.clientName || user.clientCode}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.name}
          </Typography>
          <IconButton
            size="large"
            aria-label="notifications"
            aria-controls="menu-notifications"
            aria-haspopup="true"
            onClick={handleOpenNotifications}
            color="inherit"
          >
            <Badge badgeContent={unseenCount} color="error">
              <NotificationsNone />
            </Badge>
          </IconButton>
          <Menu
            id="menu-notifications"
            anchorEl={notificationsAnchorEl}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleCloseNotifications}
            slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
          >
            {jobs.length === 0 && (
              <MenuItem disabled>
                <ListItemText primary="No background jobs yet" secondary="Blueprint and AI report generations will appear here." />
              </MenuItem>
            )}
            {jobs.map((job, index) => (
              <Box key={job.id}>
                {index > 0 && <Divider component="li" />}
                <MenuItem onClick={() => handleJobClick(job)} sx={{ alignItems: 'flex-start', py: 1.25 }}>
                  <Box sx={{ mr: 1.5, mt: 0.25 }}>
                    {job.status === 'Completed' && <CheckCircle fontSize="small" color="success" />}
                    {job.status === 'Failed' && <ErrorOutline fontSize="small" color="error" />}
                    {(job.status === 'Pending' || job.status === 'Processing') && (
                      <CircularProgress size={16} thickness={5} />
                    )}
                  </Box>
                  <ListItemText
                    primary={job.label}
                    secondary={
                      job.status === 'Completed'
                        ? 'Ready to view'
                        : job.status === 'Failed'
                          ? job.errorMessage || 'Failed'
                          : 'Processing in the background…'
                    }
                    slotProps={{
                      primary: { fontWeight: job.seen ? 400 : 700 },
                    }}
                  />
                  {(job.status === 'Completed' || job.status === 'Failed') && (
                    <IconButton
                      size="small"
                      aria-label="dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissJob(job.id);
                      }}
                      sx={{ ml: 1 }}
                    >
                      ×
                    </IconButton>
                  )}
                </MenuItem>
              </Box>
            ))}
          </Menu>
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
