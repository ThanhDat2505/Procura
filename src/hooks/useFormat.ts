import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { clock } from '@/domain/clock';
import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatFileSize,
  formatNumber,
  formatPercent,
  formatTime,
  formatVnd,
  formatVndCompact,
  type AppLocale,
} from '@/domain/format';

/** Formatters bound to the active UI language. */
export function useFormat() {
  const { i18n, t } = useTranslation('common');
  const locale: AppLocale = i18n.language === 'en' ? 'en' : 'vi';
  return useMemo(
    () => ({
      locale,
      money: (v: number) => formatVnd(v, locale),
      moneyCompact: (v: number) => formatVndCompact(v, locale),
      number: (v: number, digits = 0) => formatNumber(v, locale, digits),
      percent: (v: number, digits = 0) => formatPercent(v, locale, digits),
      date: (iso: string | Date) => formatDate(iso, locale),
      dateTime: (iso: string | Date) => formatDateTime(iso, locale),
      time: (iso: string | Date) => formatTime(iso),
      dayMonth: (iso: string | Date) => formatDayMonth(iso, locale),
      fileSize: formatFileSize,
      /** "15 phút trước", "3 giờ trước", "Hôm qua", or a date. */
      relative: (iso: string) => {
        const diffMin = Math.round((clock.now().getTime() - new Date(iso).getTime()) / 60000);
        if (diffMin < 1) return t('time.justNow');
        if (diffMin < 60) return t('time.minutesAgo', { count: diffMin });
        if (diffMin < 24 * 60) return t('time.hoursAgo', { count: Math.round(diffMin / 60) });
        if (diffMin < 48 * 60) return t('time.yesterday');
        if (diffMin < 7 * 24 * 60) return t('time.daysAgo', { count: Math.round(diffMin / 1440) });
        return formatDate(iso, locale);
      },
    }),
    [locale, t],
  );
}
