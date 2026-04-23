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
  Assessment as AssessmentIcon,
  Insights as InsightsIcon,
  HubOutlined as DataStudioIcon,
  Description as DescriptionIcon,
  AccountCircle as ProfileIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { DRAWER_WIDTH, ROUTES } from '../../core/constants';
import { NavigationItem } from '../../core/types';

interface ClientSidebarProps {
  open: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', title: 'Dashboard', path: ROUTES.CLIENT.DASHBOARD, icon: <DashboardIcon /> },
  { id: 'reports', title: 'Reports', path: ROUTES.CLIENT.REPORTS, icon: <AssessmentIcon /> },
  { id: 'insights', title: 'Insights', path: ROUTES.CLIENT.INSIGHTS, icon: <InsightsIcon /> },
  { id: 'data-studio', title: 'Data studio', path: ROUTES.CLIENT.DATA_STUDIO, icon: <DataStudioIcon /> },
  { id: 'propositions', title: 'Propositions', path: ROUTES.CLIENT.PROPOSITIONS, icon: <DescriptionIcon /> },
  { id: 'profile', title: 'Profile', path: ROUTES.CLIENT.PROFILE, icon: <ProfileIcon /> },
];

export const ClientSidebar = ({ open }: ClientSidebarProps) => {
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
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : 0,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            CLIENT MENU
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
