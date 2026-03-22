import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { ReactNode } from 'react';
import { ROUTES } from '../core/constants';

type AllowedRole = 'admin' | 'accountant' | 'client';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, only these roles can access. Others are redirected to their portal dashboard. */
  allowedRoles?: AllowedRole[];
}

const defaultRedirectByRole: Record<AllowedRole, string> = {
  admin: ROUTES.ADMIN.DASHBOARD,
  accountant: ROUTES.ACCOUNTANT.DASHBOARD,
  client: ROUTES.CLIENT.DASHBOARD,
};

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    const loginRoute = allowedRoles?.includes('admin') ? ROUTES.ADMIN.LOGIN : ROUTES.LOGIN;
    return <Navigate to={loginRoute} replace />;
  }

  if (allowedRoles?.length && user?.role && !allowedRoles.includes(user.role as AllowedRole)) {
    const redirect = defaultRedirectByRole[user.role as AllowedRole] ?? ROUTES.ROOT;
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};
