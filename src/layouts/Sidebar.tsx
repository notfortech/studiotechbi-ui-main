import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { DRAWER_WIDTH, ROUTES } from '../core/constants';
import { NavigationItem } from '../core/types';

interface SidebarProps {
  open: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: <DashboardIcon />,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon />,
  },
  {
    id: 'reports',
    title: 'Reports',
    path: '/reports',
    icon: <AssessmentIcon />,
  },
  {
    id: 'users',
    title: 'Users',
    path: '/users',
    icon: <PeopleIcon />,
  },
  {
    id: 'settings',
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
  },
];

export const Sidebar = ({ open }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            MAIN MENU
          </Typography>
        </Box>
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: location.pathname === item.path ? 'white' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
      </Box>
    </Drawer>
  );
};
