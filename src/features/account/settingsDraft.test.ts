import { describe, expect, it } from 'vitest';
import type { UserSettings } from '@/services';
import { isSettingsDirty, stageSettings } from './settingsDraft';

const saved: UserSettings = {
  language: 'vi',
  dateFormat: 'dd/mm/yyyy',
  numberFormat: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  notifications: { newQuoteEmail: true, deadlineReminder: true, weeklyDigest: false },
};

describe('settings draft', () => {
  it('is clean without a draft or when the draft equals the saved settings', () => {
    expect(isSettingsDirty(null, saved)).toBe(false);
    expect(isSettingsDirty({ ...saved, notifications: { ...saved.notifications } }, saved)).toBe(false);
  });

  it('detects top-level and notification changes', () => {
    expect(isSettingsDirty(stageSettings(null, saved, { language: 'en' }), saved)).toBe(true);
    const toggled = stageSettings(null, saved, { notifications: { ...saved.notifications, weeklyDigest: true } });
    expect(isSettingsDirty(toggled, saved)).toBe(true);
  });

  it('stacks patches on the existing draft', () => {
    const first = stageSettings(null, saved, { language: 'en' });
    const second = stageSettings(first, saved, { dateFormat: 'yyyy-mm-dd' });
    expect(second).toMatchObject({ language: 'en', dateFormat: 'yyyy-mm-dd', numberFormat: 'vi' });
  });
});
