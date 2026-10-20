import type { UserSettings } from '@/services';

export type NotificationKey = keyof UserSettings['notifications'];

export const NOTIFICATION_KEYS: NotificationKey[] = ['newQuoteEmail', 'deadlineReminder', 'weeklyDigest'];

/** True when the locally staged settings differ from what is saved. */
export function isSettingsDirty(draft: UserSettings | null, saved: UserSettings | undefined): boolean {
  if (!draft || !saved) return false;
  if (draft.language !== saved.language || draft.dateFormat !== saved.dateFormat) return true;
  if (draft.numberFormat !== saved.numberFormat || draft.timezone !== saved.timezone) return true;
  return NOTIFICATION_KEYS.some((k) => draft.notifications[k] !== saved.notifications[k]);
}

/** Applies a patch to the staged settings (or to the saved ones when nothing is staged yet). */
export function stageSettings(draft: UserSettings | null, saved: UserSettings, patch: Partial<UserSettings>): UserSettings {
  return { ...(draft ?? saved), ...patch };
}
