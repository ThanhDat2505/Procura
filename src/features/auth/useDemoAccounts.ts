import { useQuery } from '@tanstack/react-query';
import { api } from '@/services';

/** Demo credentials shown on AUTH-01 (no shared hook exists for this endpoint). */
export const useDemoAccounts = () =>
  useQuery({ queryKey: ['demo-accounts'], queryFn: () => api.auth.demoAccounts(), staleTime: Infinity });
