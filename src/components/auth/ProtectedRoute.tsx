import React, { useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePartner?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requirePartner = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isPartner } = useAuth();
  const location = useLocation();
  // useRef to fire the toast only once per mount cycle
  const toasted = useRef(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // 401 — not authenticated
  if (!user) {
    if (!toasted.current) {
      toasted.current = true;
      toast.error('Please sign in to continue');
    }
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // 403 — wrong role (admin)
  if (requireAdmin && !isAdmin) {
    if (!toasted.current) {
      toasted.current = true;
      toast.error('Access denied — admin account required');
    }
    return <Navigate to="/" replace />;
  }

  // 403 — wrong role (partner)
  if (requirePartner && !isPartner) {
    if (!toasted.current) {
      toasted.current = true;
      toast.error('Access denied — partner account required');
    }
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
