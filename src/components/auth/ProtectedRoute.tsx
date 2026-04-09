import React, { useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Shared loading screen ────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// ─── ConsumerRoute ────────────────────────────────────────────────────────────
// Wraps public/consumer pages. Blocks render until both the session AND the
// role query have settled so partners are never shown consumer content —
// not even for a single frame.
//
// Flow:
//   • loading=true                          → spinner (session resolving)
//   • loading=false, user≠null, role=null   → spinner (role DB query in flight)
//   • loading=false, user≠null, isPartner   → redirect to /partner/dashboard
//   • otherwise                             → render children normally

export function ConsumerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPartner, role } = useAuth();

  // Both the session and the role must be settled before we make a routing
  // decision. role===null with a live user means refreshRole() hasn't resolved.
  const isReady = !loading && (user === null || role !== null);

  if (!isReady) return <LoadingScreen />;

  // Authenticated partners belong in the partner area — redirect instantly.
  if (user && isPartner) {
    return <Navigate to="/partner/dashboard" replace />;
  }

  return <>{children}</>;
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

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

  if (loading) return <LoadingScreen />;

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

// ─── AdminRoute ───────────────────────────────────────────────────────────────
// Identical flicker-prevention logic to ConsumerRoute — blocks render until
// both session and role DB query have settled, then enforces isAdmin.

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, role } = useAuth();
  const location = useLocation();

  const isReady = !loading && (user === null || role !== null);
  if (!isReady) return <LoadingScreen />;

  if (!user) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ─── PublicOnlyRoute ──────────────────────────────────────────────────────────

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  if (loading) return <LoadingScreen />;

  if (user) {
    if (redirect && redirect.startsWith('/')) return <Navigate to={redirect} replace />;

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
