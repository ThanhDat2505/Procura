/**
 * Locale-aware formatting. Vietnamese conventions (DESIGN.md): "8.500 đ", "dd/mm/yyyy", tabular numbers.
 */
export type AppLocale = 'vi' | 'en';

const intlLocale = (locale: AppLocale) => (locale === 'vi' ? 'vi-VN' : 'en-US');

export function formatNumber(value: number, locale: AppLocale = 'vi', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits }).format(value);
}

/** "42.500.000 đ" (vi) / "42,500,000 ₫" (en). */
export function formatVnd(value: number, locale: AppLocale = 'vi'): string {
  const n = formatNumber(Math.round(value), locale);
  return locale === 'vi' ? `${n} đ` : `${n} ₫`;
}

/** Compact money for KPI tiles: "182,5 tr đ" / "182.5M ₫". */
export function formatVndCompact(value: number, locale: AppLocale = 'vi'): string {
  if (Math.abs(value) >= 1_000_000_000) {
    const n = formatNumber(value / 1_000_000_000, locale, 1);
    return locale === 'vi' ? `${n} tỷ đ` : `${n}B ₫`;
  }
  if (Math.abs(value) >= 1_000_000) {
    const n = formatNumber(value / 1_000_000, locale, 1);
    return locale === 'vi' ? `${n} tr đ` : `${n}M ₫`;
  }
  return formatVnd(value, locale);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/mm/yyyy in vi, mm/dd/yyyy in en. */
export function formatDate(iso: string | Date, locale: AppLocale = 'vi'): string {
  const d = new Date(iso);
  return locale === 'vi'
    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function formatTime(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "17:00 20/11/2025". */
export function formatDateTime(iso: string | Date, locale: AppLocale = 'vi'): string {
  return `${formatTime(iso)} ${formatDate(iso, locale)}`;
}

/** "20/11" short day-month. */
export function formatDayMonth(iso: string | Date, locale: AppLocale = 'vi'): string {
  const d = new Date(iso);
  return locale === 'vi' ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatPercent(value: number, locale: AppLocale = 'vi', digits = 0): string {
  return `${formatNumber(value * 100, locale, digits)}%`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}
