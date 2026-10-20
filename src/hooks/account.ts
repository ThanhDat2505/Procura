import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ID } from '@/domain/types';
import { setLanguage } from '@/i18n';
import { api, type UserSettings } from '@/services';

export const accountKeys = {
  notifications: ['notifications'] as const,
  settings: ['settings'] as const,
};

/** Polls so simulated supplier replies show up in the bell without a reload. */
export const useNotifications = () =>
  useQuery({ queryKey: accountKeys.notifications, queryFn: () => api.notifications.list(), refetchInterval: 10_000 });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: ID) => api.notifications.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.notifications }) });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.notifications.markAllRead(), onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.notifications }) });
}

export const useSettings = () => useQuery({ queryKey: accountKeys.settings, queryFn: () => api.settings.get() });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => api.settings.update(patch),
    onSuccess: (settings) => {
      qc.setQueryData(accountKeys.settings, settings);
      setLanguage(settings.language);
    },
  });
}
