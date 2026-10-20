import { describe, expect, it } from 'vitest';
import { barPercent, bestWinMonths, lossShares, niceScale, parseMonth, recentStatus, toCsv, topLossReason } from './performanceHelpers';

describe('chart scaling', () => {
  it('builds nice integer scales', () => {
    expect(niceScale(5)).toEqual({ max: 6, ticks: [0, 2, 4, 6] });
    expect(niceScale(3)).toEqual({ max: 3, ticks: [0, 1, 2, 3] });
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(37).max).toBe(40);
  });
  it('maps values to bar heights', () => {
    expect(barPercent(3, 6)).toBe(50);
    expect(barPercent(9, 6)).toBe(100);
    expect(barPercent(1, 0)).toBe(0);
  });
  it('parses month keys', () => {
    expect(parseMonth('2025-07')).toEqual({ month: 7, year: 2025 });
  });
});

describe('performance helpers', () => {
  const monthly = [
    { month: '2025-05', submitted: 3, awarded: 1 },
    { month: '2025-07', submitted: 2, awarded: 1 },
    { month: '2025-09', submitted: 4, awarded: 2 },
    { month: '2025-10', submitted: 0, awarded: 0 },
  ];
  it('finds the best win-rate months (ties included)', () => {
    expect(bestWinMonths(monthly)).toEqual({ months: ['2025-07', '2025-09'], rate: 0.5 });
    expect(bestWinMonths([{ month: '2025-05', submitted: 2, awarded: 0 }])).toBeNull();
  });
  it('computes loss shares and the top reason', () => {
    const reasons = [
      { key: 'price' as const, count: 2 },
      { key: 'leadTime' as const, count: 1 },
      { key: 'moq' as const, count: 1 },
      { key: 'other' as const, count: 0 },
    ];
    expect(lossShares(reasons).map((r) => r.share)).toEqual([0.5, 0.25, 0.25, 0]);
    expect(topLossReason(reasons)).toBe('price');
    expect(topLossReason(reasons.map((r) => ({ ...r, count: 0 })))).toBeNull();
  });
  it('maps quotation status to the supplier-facing result', () => {
    expect(recentStatus('awarded')).toBe('awarded');
    expect(recentStatus('viewed')).toBe('comparing');
    expect(recentStatus('not_selected')).toBe('notSelected');
    expect(recentStatus('expired')).toBe('closed');
  });
  it('writes CSV with quoting and a BOM', () => {
    expect(toCsv([['Chỉ số', 'Giá trị'], ['Tỷ lệ, %', 'a "b"']])).toBe('﻿Chỉ số,Giá trị\r\n"Tỷ lệ, %","a ""b"""');
  });
});
