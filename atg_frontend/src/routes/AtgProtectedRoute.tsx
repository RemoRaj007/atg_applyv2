import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import type { User } from '../types/user.types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User['role'][];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Carry where they were heading, so a shared or bookmarked deep link
    // survives the sign-in instead of dropping them on the dashboard.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Send the user to their own home instead of back to /login, which prevents
    // a redirect loop when a role tries to access a route it isn't allowed on.
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}
