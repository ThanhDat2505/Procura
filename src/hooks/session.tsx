import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { Role, Session, User } from '@/domain/types';
import { api, type LoginInput } from '@/services';

interface SessionContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  login(input: LoginInput): Promise<Session>;
  logout(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const sessionKey = ['session'] as const;

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: sessionKey, queryFn: () => api.auth.getSession(), staleTime: Infinity });

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await api.auth.login(input);
      // Drop data cached for a previous account before switching roles.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      queryClient.setQueryData(sessionKey, session);
      return session;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    queryClient.setQueryData(sessionKey, null);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({ session: data ?? null, user: data?.user ?? null, isLoading, login, logout }),
    [data, isLoading, login, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** Current user; only call inside routes guarded for a role. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}

export function homePathFor(role: Role): string {
  return role === 'buyer' ? '/buyer' : '/supplier';
}
