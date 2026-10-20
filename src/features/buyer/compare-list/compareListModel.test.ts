import type { CompareOverview } from '@/services';
import { mockApi as api, resetMockDb } from '@/services/mock';
import { filterOverview, overviewCategories, overviewStats, quarterOf } from './compareListModel';

describe('compareListModel (BUY-09)', () => {
  let data: CompareOverview;

  beforeEach(async () => {
    resetMockDb();
    await api.auth.login({ email: 'hoang.tn@anphuoc.vn', password: '123456', role: 'buyer', remember: false });
    data = await api.rfqs.compareOverview();
  });

  it('derives the quarter label', () => {
    expect(quarterOf(new Date(2025, 10, 18))).toEqual({ quarter: 4, year: 2025 });
    expect(quarterOf(new Date(2026, 0, 1))).toEqual({ quarter: 1, year: 2026 });
    expect(quarterOf(new Date(2026, 5, 30))).toEqual({ quarter: 2, year: 2026 });
  });

  it('matches the server stats when no filter is applied', () => {
    const stats = overviewStats(filterOverview(data, 'all'));
    expect(stats).toMatchObject({ ready: data.stats.ready, waiting: data.stats.waiting, awarded: data.stats.awarded, negotiatedBudget: data.stats.negotiatedBudget });
  });

  it('sorts ready RFQs by deadline and filters by category', () => {
    const all = filterOverview(data, 'all');
    const deadlines = all.ready.map((c) => c.item.rfq.deadline);
    expect(deadlines).toEqual([...deadlines].sort());
    expect(all.ready[0].item.rfq.code).toBe('RFQ-2025-089');

    const packaging = filterOverview(data, 'packaging');
    expect([...packaging.ready, ...packaging.waiting, ...packaging.awarded].every((c) => c.item.rfq.categoryId === 'packaging')).toBe(true);
    expect(overviewCategories(data)).toContain('packaging');
  });

  it('averages savings over awarded RFQs with a budget', () => {
    const card = data.awarded[0] ?? data.ready[0];
    const stats = overviewStats({
      ready: [],
      waiting: [],
      awarded: [
        { ...card, savingsRate: 0.1 },
        { ...card, savingsRate: 0.2 },
        { ...card, savingsRate: undefined },
      ],
    });
    expect(stats.avgSavings).toBeCloseTo(0.15);
    expect(overviewStats({ ready: [], waiting: [], awarded: [] }).avgSavings).toBeNull();
  });
});
