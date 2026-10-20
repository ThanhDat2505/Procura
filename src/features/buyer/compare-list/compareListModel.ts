import type { CategoryId } from '@/domain/types';
import type { CompareOverview, CompareOverviewCard } from '@/services';

/** Pure helpers for BUY-09 (comparison overview). */

export function quarterOf(date: Date): { quarter: number; year: number } {
  return { quarter: Math.floor(date.getMonth() / 3) + 1, year: date.getFullYear() };
}

export type CategoryFilter = 'all' | CategoryId;

export function filterOverview(data: CompareOverview, category: CategoryFilter): Pick<CompareOverview, 'ready' | 'waiting' | 'awarded'> {
  const keep = (c: CompareOverviewCard) => category === 'all' || c.item.rfq.categoryId === category;
  const byDeadline = (a: CompareOverviewCard, b: CompareOverviewCard) => a.item.rfq.deadline.localeCompare(b.item.rfq.deadline);
  const byDecision = (a: CompareOverviewCard, b: CompareOverviewCard) => (b.item.rfq.awardedAt ?? '').localeCompare(a.item.rfq.awardedAt ?? '');
  return {
    ready: data.ready.filter(keep).sort(byDeadline),
    waiting: data.waiting.filter(keep).sort(byDeadline),
    awarded: data.awarded.filter(keep).sort(byDecision),
  };
}

export interface OverviewStats {
  ready: number;
  waiting: number;
  awarded: number;
  /** Mean savings vs. budget over awarded RFQs that have a budget; null when none. */
  avgSavings: number | null;
  /** Budget ceiling of RFQs being negotiated or already awarded. */
  negotiatedBudget: number;
}

export function overviewStats(lists: Pick<CompareOverview, 'ready' | 'waiting' | 'awarded'>): OverviewStats {
  const savings = lists.awarded.map((c) => c.savingsRate).filter((r): r is number => typeof r === 'number');
  return {
    ready: lists.ready.length,
    waiting: lists.waiting.length,
    awarded: lists.awarded.length,
    avgSavings: savings.length ? savings.reduce((s, r) => s + r, 0) / savings.length : null,
    negotiatedBudget: [...lists.ready, ...lists.awarded].reduce((s, c) => s + (c.item.rfq.budgetMax ?? 0), 0),
  };
}

/** Categories that actually appear in the overview (for the filter select). */
export function overviewCategories(data: CompareOverview): CategoryId[] {
  const set = new Set<CategoryId>();
  for (const c of [...data.ready, ...data.waiting, ...data.awarded]) set.add(c.item.rfq.categoryId);
  return [...set];
}
