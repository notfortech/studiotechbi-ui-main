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
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  AccountCircle as ProfileIcon,
  AutoAwesome as BlueprintIcon,
  AutoGraph as ReportGeneratorIcon,
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
  { id: 'blueprint', title: 'Generate Blueprint', path: ROUTES.CLIENT.BLUEPRINT, icon: <BlueprintIcon /> },
  { id: 'report-generator', title: 'Report Generator', path: ROUTES.CLIENT.REPORT_GENERATOR, icon: <ReportGeneratorIcon /> },
  { id: 'propositions', title: 'Propositions', path: ROUTES.CLIENT.PROPOSITIONS, icon: <DescriptionIcon /> },
  { id: 'profile', title: 'Profile', path: ROUTES.CLIENT.PROFILE, icon: <ProfileIcon /> },
];

const INACTIVE_TEXT = alpha('#FFFFFF', 0.7);
const ACCENT = '#C99C55'; // brass — the one accent this dark surface gets

// Floating-panel geometry: the drawer no longer runs flush edge-to-edge —
// it's inset from the viewport on three sides so it reads as a distinct
// card rather than a structural rectangle bolted to the window.
const SIDEBAR_INSET = 16;
const SIDEBAR_TOP_OFFSET = 84;

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
          width: open ? DRAWER_WIDTH - SIDEBAR_INSET : 0,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowY: 'auto',
          top: SIDEBAR_TOP_OFFSET,
          left: SIDEBAR_INSET,
          bottom: SIDEBAR_INSET,
          height: `calc(100% - ${SIDEBAR_TOP_OFFSET + SIDEBAR_INSET}px)`,
          border: 'none',
          borderRadius: 4,
          boxShadow:
            '0 24px 48px -20px rgba(13, 21, 38, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: (theme) =>
            theme.transitions.create(['width', 'opacity'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        },
      }}
    >
      <Box sx={{ overflow: 'auto', pt: 2.5 }}>
        <Box sx={{ px: 2.5, mb: 2 }}>
          <Typography
            variant="overline"
            sx={{ color: alpha('#FFFFFF', 0.45), fontSize: 10.5 }}
          >
            Client Menu
          </Typography>
        </Box>
        <List sx={{ px: 1.25 }}>
          {navigationItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1,
                    color: active ? '#FFFFFF' : INACTIVE_TEXT,
                    position: 'relative',
                    transition: 'background-color 140ms ease, color 140ms ease',
                    '&:hover': {
                      backgroundColor: alpha('#FFFFFF', 0.06),
                      color: '#FFFFFF',
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(ACCENT, 0.14),
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -10,
                        top: '20%',
                        height: '60%',
                        width: 3,
                        borderRadius: 4,
                        backgroundColor: ACCENT,
                      },
                      '&:hover': {
                        backgroundColor: alpha(ACCENT, 0.18),
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 38,
                      color: active ? ACCENT : alpha('#FFFFFF', 0.55),
                      transition: 'color 140ms ease',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{ fontSize: 14.5, fontWeight: active ? 600 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ my: 2, mx: 2.5, borderColor: alpha('#FFFFFF', 0.08) }} />
      </Box>
    </Drawer>
  );
};
