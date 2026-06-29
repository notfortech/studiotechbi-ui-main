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
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  AutoAwesome as BlueprintIcon,
  List as ListIcon,
  ExpandLess,
  ExpandMore,
  BugReport as FunctionalLogIcon,
  Code as TechnicalLogIcon,
  Apartment as TenantsIcon,
  BarChart as PowerBIIcon,
  AccountTree as PipelineIcon,
  CloudUpload as FileUploadIcon,
  Refresh as DatasetRefreshIcon,
  History as AuditLogIcon,
  MonitorHeart as SystemHealthIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { DRAWER_WIDTH, ROUTES } from '../../core/constants';

interface AdminSidebarProps {
  open: boolean;
}

const mainItems = [
  { id: 'dashboard', title: 'Dashboard', path: ROUTES.ADMIN.DASHBOARD, icon: <DashboardIcon /> },
  { id: 'tenants', title: 'Tenants', path: ROUTES.ADMIN.TENANTS, icon: <TenantsIcon /> },
  { id: 'users', title: 'Users', path: ROUTES.ADMIN.USERS, icon: <PeopleIcon /> },
  { id: 'clients', title: 'Clients', path: ROUTES.ADMIN.CLIENTS, icon: <BusinessIcon /> },
  { id: 'templates', title: 'Templates', path: ROUTES.ADMIN.TEMPLATES, icon: <DescriptionIcon /> },
  { id: 'powerbi', title: 'Power BI Assets', path: ROUTES.ADMIN.POWERBI_ASSETS, icon: <PowerBIIcon /> },
  { id: 'pipeline', title: 'Pipeline Monitoring', path: ROUTES.ADMIN.PIPELINE_MONITORING, icon: <PipelineIcon /> },
  { id: 'file-uploads', title: 'File Upload Monitoring', path: ROUTES.ADMIN.FILE_UPLOAD_MONITORING, icon: <FileUploadIcon /> },
  { id: 'dataset-refresh', title: 'Dataset Refresh Logs', path: ROUTES.ADMIN.DATASET_REFRESH_LOGS, icon: <DatasetRefreshIcon /> },
  { id: 'jobs', title: 'Processing Jobs', path: ROUTES.ADMIN.JOBS, icon: <WorkIcon /> },
  { id: 'blueprints', title: 'Blueprints', path: ROUTES.ADMIN.BLUEPRINTS, icon: <BlueprintIcon /> },
  { id: 'audit', title: 'Audit Logs', path: ROUTES.ADMIN.AUDIT_LOGS, icon: <AuditLogIcon /> },
  { id: 'system-health', title: 'System Health', path: ROUTES.ADMIN.SYSTEM_HEALTH, icon: <SystemHealthIcon /> },
];

const logsItems = [
  { id: 'functional', title: 'Functional Logs', path: ROUTES.ADMIN.LOGS_FUNCTIONAL, icon: <FunctionalLogIcon /> },
  { id: 'technical', title: 'Technical Logs', path: ROUTES.ADMIN.LOGS_TECHNICAL, icon: <TechnicalLogIcon /> },
];

export const AdminSidebar = ({ open }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logsOpen = location.pathname.startsWith('/admin/logs');
  const [logsExpanded, setLogsExpanded] = useState(logsOpen);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isSelected = (path: string) => location.pathname === path;

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
            ADMIN MENU
          </Typography>
        </Box>
        <List>
          {mainItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={isSelected(item.path)}
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
                    color: isSelected(item.path) ? 'white' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setLogsExpanded(!logsExpanded)}
              sx={{ mx: 1, borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ListIcon />
              </ListItemIcon>
              <ListItemText primary="Logs" />
              {logsExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={logsExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {logsItems.map((item) => (
                <ListItem key={item.id} disablePadding sx={{ pl: 3 }}>
                  <ListItemButton
                    selected={isSelected(item.path)}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
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
                        minWidth: 36,
                        color: isSelected(item.path) ? 'white' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </List>
        <Divider sx={{ my: 2 }} />
      </Box>
    </Drawer>
  );
};
