import { RouteObject, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { LoginPage } from '../portals/LoginPage';
import { SignupPage } from '../portals/SignupPage';
import { LandingPage } from '../portals/LandingPage';
import { AdminLayout } from '../layouts/admin/AdminLayout';
import { AccountantLayout } from '../layouts/accountant/AccountantLayout';
import { ClientLayout } from '../layouts/client/ClientLayout';
import { AdminLoginPage } from '../portals/admin/AdminLoginPage';
import { AdminDashboard } from '../portals/admin/AdminDashboard';
import { TenantsPage } from '../portals/admin/TenantsPage';
import { UsersPage } from '../portals/admin/UsersPage';
import { ClientsPage } from '../portals/admin/ClientsPage';
import { ClientDetailsPage } from '../portals/admin/ClientDetailsPage';
import { TemplatesPage } from '../portals/admin/TemplatesPage';
import { PowerBIAssetsPage } from '../portals/admin/PowerBIAssetsPage';
import { PipelineMonitoringPage } from '../portals/admin/PipelineMonitoringPage';
import { FileUploadMonitoringPage } from '../portals/admin/FileUploadMonitoringPage';
import { DatasetRefreshLogsPage } from '../portals/admin/DatasetRefreshLogsPage';
import { ProcessingJobsPage } from '../portals/admin/ProcessingJobsPage';
import { AuditLogsPage } from '../portals/admin/AuditLogsPage';
import { SystemHealthPage } from '../portals/admin/SystemHealthPage';
import { FunctionalLogsPage } from '../portals/admin/FunctionalLogsPage';
import { TechnicalLogsPage } from '../portals/admin/TechnicalLogsPage';
import { SettingsPage } from '../portals/admin/SettingsPage';
import { AdminReportsPage } from '../portals/admin/ReportsPage';
import { BlueprintsPage } from '../portals/admin/BlueprintsPage';
import { AccountantDashboard } from '../portals/accountant/AccountantDashboard';
import { AccountantClientsPage } from '../portals/accountant/ClientsPage';
import { AccountantReportsPage } from '../portals/accountant/ReportsPage';
import { ClientDashboard } from '../portals/client/ClientDashboard';
import { ClientReportsPage } from '../portals/client/ReportsPage';
import { ReportsListPage } from '../portals/client/ReportsListPage';
import { PropositionsPage } from '../portals/client/PropositionsPage';
import { ProfilePage } from '../portals/client/ProfilePage';
import { ROUTES } from './constants';

export const routes: RouteObject[] = [
  {
    path: ROUTES.LANDING,
    element: <LandingPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.SIGNUP,
    element: <SignupPage />,
  },
  {
    path: ROUTES.ADMIN.LOGIN,
    element: <AdminLoginPage />,
  },
  {
    path: ROUTES.ADMIN.BASE,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'tenants',
        element: <TenantsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'clients',
        element: <ClientsPage />,
      },
      {
        path: 'clients/:clientId',
        element: <ClientDetailsPage />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'powerbi-assets',
        element: <PowerBIAssetsPage />,
      },
      {
        path: 'pipeline',
        element: <PipelineMonitoringPage />,
      },
      {
        path: 'file-uploads',
        element: <FileUploadMonitoringPage />,
      },
      {
        path: 'dataset-refresh',
        element: <DatasetRefreshLogsPage />,
      },
      {
        path: 'jobs',
        element: <ProcessingJobsPage />,
      },
      {
        path: 'audit-logs',
        element: <AuditLogsPage />,
      },
      {
        path: 'system-health',
        element: <SystemHealthPage />,
      },
      {
        path: 'logs/functional',
        element: <FunctionalLogsPage />,
      },
      {
        path: 'logs/technical',
        element: <TechnicalLogsPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: 'blueprints',
        element: <BlueprintsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: ROUTES.ACCOUNTANT.BASE,
    element: (
      <ProtectedRoute allowedRoles={['accountant']}>
        <AccountantLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.ACCOUNTANT.DASHBOARD} replace />,
      },
      {
        path: 'dashboard',
        element: <AccountantDashboard />,
      },
      {
        path: 'clients',
        element: <AccountantClientsPage />,
      },
      {
        path: 'reports',
        element: <AccountantReportsPage />,
      },
      {
        path: 'insights',
        element: <Navigate to={ROUTES.ACCOUNTANT.REPORTS} replace />,
      },
      {
        path: 'data-studio',
        element: <Navigate to={ROUTES.ACCOUNTANT.REPORTS} replace />,
      },
    ],
  },
  {
    path: ROUTES.CLIENT.BASE,
    element: (
      <ProtectedRoute allowedRoles={['client']}>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.CLIENT.DASHBOARD} replace />,
      },
      {
        path: 'dashboard',
        element: <ClientDashboard />,
      },
      {
        path: 'reports',
        element: <ReportsListPage />,
      },
      {
        path: 'reports/view',
        element: <ClientReportsPage />,
      },
      {
        path: 'propositions',
        element: <PropositionsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'property',
        element: <Navigate to={ROUTES.CLIENT.REPORTS} replace />,
      },
      {
        path: 'insights',
        element: <Navigate to={ROUTES.CLIENT.REPORTS} replace />,
      },
      {
        path: 'data-studio',
        element: <Navigate to={ROUTES.CLIENT.REPORTS} replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.LANDING} replace />,
  },
];
