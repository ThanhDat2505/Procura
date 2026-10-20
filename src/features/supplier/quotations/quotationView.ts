import { daysBetween } from '@/domain/clock';
import { quotationProgressStep, quotationValidUntil } from '@/domain/quotation';
import type { Quotation } from '@/domain/types';

// ---------------------------------------------------------------------------
// Validity column (SUP-03 "Thời hạn hiệu lực")
// ---------------------------------------------------------------------------

export interface ValidityState {
  until: Date;
  /** Whole days left until the quotation stops being valid (negative once expired). */
  daysLeft: number;
  expired: boolean;
}

export function validityState(q: Pick<Quotation, 'submittedAt' | 'createdAt' | 'validityDays'>, now: Date): ValidityState {
  const until = quotationValidUntil(q);
  const daysLeft = daysBetween(now, until);
  return { until, daysLeft, expired: until.getTime() <= now.getTime() };
}

// ---------------------------------------------------------------------------
// Client-side filters (SUP-03 "Bộ lọc nâng cao")
// ---------------------------------------------------------------------------

export type TimeRange = 'all' | '30d' | 'quarter' | 'prevQuarter';
export const TIME_RANGES: TimeRange[] = ['all', '30d', 'quarter', 'prevQuarter'];

function quarterStart(year: number, quarter: number): Date {
  return new Date(year, quarter * 3, 1);
}

/** Whether `iso` falls inside the selected range, relative to `now`. */
export function inTimeRange(iso: string | undefined, range: TimeRange, now: Date): boolean {
  if (range === 'all') return true;
  if (!iso) return false;
  const at = new Date(iso);
  if (range === '30d') {
    const diff = daysBetween(at, now);
    return diff >= 0 && diff <= 30;
  }
  const q = Math.floor(now.getMonth() / 3);
  const start = range === 'quarter' ? quarterStart(now.getFullYear(), q) : quarterStart(now.getFullYear(), q - 1);
  const end = range === 'quarter' ? quarterStart(now.getFullYear(), q + 1) : quarterStart(now.getFullYear(), q);
  return at.getTime() >= start.getTime() && at.getTime() < end.getTime();
}

/** "Tỷ lệ thắng thầu" = awarded / submitted (0 when nothing was submitted). */
export function winRate(awarded: number, submitted: number): number {
  return submitted > 0 ? awarded / submitted : 0;
}

// ---------------------------------------------------------------------------
// Review progress (SUP-04b "Tiến trình xét duyệt thầu")
// ---------------------------------------------------------------------------

export type StepState = 'done' | 'active' | 'pending';

/**
 * State of the 4 steps: Đã gửi → Người mua đã xem → Chờ kết quả mở thầu → Kết quả lựa chọn NCC.
 * A withdrawn or expired quotation keeps only the first step done.
 */
export function progressSteps(q: Pick<Quotation, 'status'>): [StepState, StepState, StepState, StepState] {
  if (q.status === 'withdrawn' || q.status === 'expired') return ['done', 'pending', 'pending', 'pending'];
  const current = quotationProgressStep(q as Quotation);
  if (current === 4) return ['done', 'done', 'done', 'done'];
  if (q.status === 'draft') return ['active', 'pending', 'pending', 'pending'];
  return [1, 2, 3, 4].map((i) => (i < current ? 'done' : i === current ? 'active' : 'pending')) as [StepState, StepState, StepState, StepState];
}
