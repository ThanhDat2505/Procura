import type { LossReason, SupplierPerformance } from '@/domain/performance';
import type { QuotationStatus } from '@/domain/types';

type Monthly = SupplierPerformance['monthly'];

/** "2025-05" → { month: 5, year: 2025 }. */
export function parseMonth(key: string): { month: number; year: number } {
  const [y, m] = key.split('-').map(Number);
  return { month: m, year: y };
}

/**
 * A "nice" integer y-scale for count data: the top tick is the smallest 1/2/5×10ⁿ multiple that
 * covers `max`, split into at most `maxTicks` intervals.
 */
export function niceScale(max: number, maxTicks = 4): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const rough = max / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v));
  return { max: top, ticks };
}

/** Bar height as a percentage of the plot height. */
export function barPercent(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.max(0, Math.min(100, (value / scaleMax) * 100));
}

/** The month(s) with the highest win rate (awarded ÷ submitted); null when nothing was submitted. */
export function bestWinMonths(monthly: Monthly): { months: string[]; rate: number } | null {
  const rated = monthly.filter((m) => m.submitted > 0).map((m) => ({ month: m.month, rate: m.awarded / m.submitted }));
  if (rated.length === 0) return null;
  const best = Math.max(...rated.map((r) => r.rate));
  if (best === 0) return null;
  return { months: rated.filter((r) => Math.abs(r.rate - best) < 1e-9).map((r) => r.month), rate: best };
}

export interface LossShare {
  key: LossReason;
  count: number;
  /** Share of all not-selected quotations, 0..1. */
  share: number;
}

/** Loss reasons with their share of the total, in the fixed domain order (colour follows the reason). */
export function lossShares(reasons: SupplierPerformance['lossReasons']): LossShare[] {
  const total = reasons.reduce((s, r) => s + r.count, 0);
  return reasons.map((r) => ({ key: r.key, count: r.count, share: total ? r.count / total : 0 }));
}

/** The most frequent loss reason (first in domain order on ties), or null when there are no losses. */
export function topLossReason(reasons: SupplierPerformance['lossReasons']): LossReason | null {
  let top: { key: LossReason; count: number } | null = null;
  for (const r of reasons) if (r.count > 0 && (!top || r.count > top.count)) top = r;
  return top?.key ?? null;
}

export type RecentStatus = 'awarded' | 'notSelected' | 'comparing' | 'closed';

/** Supplier-facing status of a recent quotation (SUP-06 right column). */
export function recentStatus(status: QuotationStatus): RecentStatus {
  if (status === 'awarded') return 'awarded';
  if (status === 'not_selected') return 'notSelected';
  if (status === 'submitted' || status === 'viewed') return 'comparing';
  return 'closed';
}

/** RFC 4180 CSV (CRLF, quoted when needed) with a UTF-8 BOM so Excel reads Vietnamese correctly. */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}`;
}
