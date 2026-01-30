import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePartner?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requirePartner = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isPartner } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requirePartner && !isPartner) {
    return <Navigate to="/partner" replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    if (redirect) return <Navigate to={redirect} replace />;

    const defaultPath =
      role === 'admin'
        ? '/admin'
        : role === 'partner'
          ? '/partner/dashboard'
          : '/profile';

    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
}
