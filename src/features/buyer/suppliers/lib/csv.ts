/**
 * Tiny client-side CSV export used by BUY-02 ("Xuất danh sách") and BUY-04 ("Xuất Excel").
 * Output opens correctly in Excel (UTF-8 BOM added on download, CRLF line endings).
 */

export type CsvCell = string | number | null | undefined;

/** Cells starting with these characters are treated as formulas by spreadsheet apps. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(header: CsvCell[], rows: CsvCell[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
