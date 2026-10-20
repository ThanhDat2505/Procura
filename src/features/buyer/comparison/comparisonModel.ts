import { daysBetween } from '@/domain/clock';
import type { ComparedQuote } from '@/domain/comparison';
import type { ID, Quotation, Rfq } from '@/domain/types';

/**
 * Pure helpers for BUY-08 (quotation comparison matrix). Scoring itself lives in `@/domain/comparison`;
 * this module only decides what to show.
 */

export const MATRIX_ROWS = ['reliability', 'unitPrice', 'moq', 'leadTime', 'payment', 'validity', 'tooling', 'score'] as const;
export type MatrixRowKey = (typeof MATRIX_ROWS)[number];
export type MatrixMode = 'all' | 'diff';

/** Days left before a quotation expires; ≤ this shows "Sắp hết hạn". */
export const EXPIRING_SOON_DAYS = 15;

const certKey = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/2015$/, '');

/**
 * Supplier certificates plus any extra ones listed on the quote, without near-duplicates
 * ("ISO 9001:2015" already covers "ISO 9001", "FSC CoC" covers "FSC").
 */
export function mergeCertifications(supplierCerts: string[], quoteCerts: string[]): string[] {
  const out: string[] = [];
  for (const cert of [...supplierCerts, ...quoteCerts]) {
    const key = certKey(cert);
    if (!key || out.some((c) => certKey(c).startsWith(key) || key.startsWith(certKey(c)))) continue;
    out.push(cert);
  }
  return out;
}

/** Value that decides whether a criterion differs between suppliers. */
export function rowSignature(row: ComparedQuote, key: MatrixRowKey): string {
  const { quotation: q, supplier: s } = row;
  switch (key) {
    case 'reliability': {
      const certs = mergeCertifications(s.certifications, q.certifications).sort().join('|');
      return [s.verified, s.audit?.result ?? '', certs, s.rating, s.completedRfqCount].join('#');
    }
    case 'unitPrice':
      return `${q.unitPrice}#${row.effectiveQuantity}`;
    case 'moq':
      return `${q.moq}`;
    case 'leadTime':
      return `${q.leadTimeDays}`;
    case 'payment':
      return q.paymentTerms.trim().toLowerCase();
    case 'validity':
      return `${q.validityDays}`;
    case 'tooling':
      return `${q.toolingCost}#${(q.toolingNote ?? '').trim().toLowerCase()}`;
    case 'score':
      return `${row.score}`;
  }
}

/** Rows to render: all criteria, or only those whose values differ across the compared suppliers. */
export function visibleMatrixRows(rows: ComparedQuote[], mode: MatrixMode): MatrixRowKey[] {
  if (mode === 'all') return [...MATRIX_ROWS];
  return MATRIX_ROWS.filter((key) => new Set(rows.map((r) => rowSignature(r, key))).size > 1);
}

/**
 * Quotes that take part in the comparison.
 * - `ids` (from `?ids=a,b`) restricts the set; unknown ids are ignored and an empty match falls back to all.
 * - While the RFQ is open, quotes the buyer already rejected are left out of the matrix.
 */
export function selectComparedQuotes(rfq: Pick<Rfq, 'lifecycle'>, quotations: Quotation[], ids: ID[] | null): Quotation[] {
  let list = quotations;
  if (rfq.lifecycle === 'open') list = list.filter((q) => q.status !== 'not_selected');
  if (ids && ids.length) {
    const wanted = new Set(ids);
    const restricted = list.filter((q) => wanted.has(q.id));
    if (restricted.length) list = restricted;
  }
  return list;
}

/** Column order: the highlighted quote (awarded, else recommended) first, then the original order. */
export function orderColumns(rows: ComparedQuote[], highlightId: ID | undefined): ComparedQuote[] {
  if (!highlightId) return rows;
  const first = rows.filter((r) => r.quotation.id === highlightId);
  return [...first, ...rows.filter((r) => r.quotation.id !== highlightId)];
}

export function parseIds(param: string | null): ID[] | null {
  if (!param) return null;
  const ids = param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : null;
}

export function validityDaysLeft(row: ComparedQuote, now: Date): number {
  return daysBetween(now, row.validUntil);
}

/** True when a criterion flag is meaningful, i.e. not shared by every compared quote. */
export function distinctive(rows: ComparedQuote[], pick: (r: ComparedQuote) => boolean): boolean {
  const n = rows.filter(pick).length;
  return n > 0 && n < rows.length;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds a CSV (UTF-8 with BOM so Excel shows Vietnamese correctly) from a header row and labelled rows.
 * `rows` is a list of [label, ...one value per supplier].
 */
export function buildCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((line) => line.map(csvCell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
