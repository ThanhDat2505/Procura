/** Pure helpers for BUY-05 (RFQ list). */

/** RFC 4180 CSV: quotes fields containing separators, quotes or line breaks. BOM so Excel reads UTF-8. */
export function toCsv(rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(escape).join(',')).join('\r\n');
}

/** Paginates an in-memory list (used for the combined "Hết hạn / Đã hủy" tab). */
export function paginateLocal<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
