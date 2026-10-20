import { toCsv } from './csv';
import { inTimeRange, progressSteps, validityState, winRate } from './quotationView';

const now = new Date('2025-11-18T09:30:00+07:00');

describe('toCsv', () => {
  it('prefixes a BOM and escapes commas, quotes and new lines', () => {
    const csv = toCsv([
      ['Mã', 'Ghi chú'],
      ['QT-1', 'a, "b"\nc'],
      [1, null],
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['Mã,Ghi chú', 'QT-1,"a, ""b""\nc"', '1,']);
  });
});

describe('validityState', () => {
  it('counts the days left from the submission date', () => {
    const v = validityState({ submittedAt: '2025-11-17T07:28:00.000Z', createdAt: '2025-11-17T07:28:00.000Z', validityDays: 30 }, now);
    expect(v.expired).toBe(false);
    expect(v.daysLeft).toBe(29);
  });

  it('marks quotations past their validity as expired', () => {
    const v = validityState({ submittedAt: '2025-08-13T03:00:00.000Z', createdAt: '2025-08-13T03:00:00.000Z', validityDays: 30 }, now);
    expect(v.expired).toBe(true);
    expect(v.daysLeft).toBeLessThan(0);
  });
});

describe('inTimeRange', () => {
  it('accepts everything for "all"', () => {
    expect(inTimeRange(undefined, 'all', now)).toBe(true);
  });

  it('handles the last 30 days', () => {
    expect(inTimeRange('2025-11-01T10:00:00+07:00', '30d', now)).toBe(true);
    expect(inTimeRange('2025-10-01T10:00:00+07:00', '30d', now)).toBe(false);
  });

  it('handles the current and previous quarter', () => {
    expect(inTimeRange('2025-10-02T10:00:00+07:00', 'quarter', now)).toBe(true);
    expect(inTimeRange('2025-09-20T10:00:00+07:00', 'quarter', now)).toBe(false);
    expect(inTimeRange('2025-09-20T10:00:00+07:00', 'prevQuarter', now)).toBe(true);
    expect(inTimeRange('2025-06-20T10:00:00+07:00', 'prevQuarter', now)).toBe(false);
  });
});

describe('winRate', () => {
  it('divides awarded by submitted and guards against zero', () => {
    expect(winRate(8, 21)).toBeCloseTo(0.381, 3);
    expect(winRate(0, 0)).toBe(0);
  });
});

describe('progressSteps', () => {
  it('follows the quotation status', () => {
    expect(progressSteps({ status: 'submitted' })).toEqual(['done', 'active', 'pending', 'pending']);
    expect(progressSteps({ status: 'viewed' })).toEqual(['done', 'done', 'active', 'pending']);
    expect(progressSteps({ status: 'awarded' })).toEqual(['done', 'done', 'done', 'done']);
    expect(progressSteps({ status: 'not_selected' })).toEqual(['done', 'done', 'done', 'done']);
    expect(progressSteps({ status: 'withdrawn' })).toEqual(['done', 'pending', 'pending', 'pending']);
  });
});
