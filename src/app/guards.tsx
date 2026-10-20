import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '@/components/ui';
import type { Role } from '@/domain/types';
import { homePathFor, useSession } from '@/hooks/session';

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

/** Only lets a signed-in user of `role` through; otherwise sends them to login or their own portal. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, role }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

export function RootRedirect() {
  const { user, isLoading } = useSession();
  if (isLoading) return <FullPageSpinner />;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

/** Login page is only for signed-out users; after sign-in, return to the page that required it. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();
  if (isLoading) return <FullPageSpinner />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    const home = homePathFor(user.role);
    return <Navigate to={from && from.startsWith(home) ? from : home} replace />;
  }
  return <>{children}</>;
}
