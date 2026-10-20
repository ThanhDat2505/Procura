import { toCsv, paginateLocal } from '../rfqs/listHelpers';
import {
  dateInputToIso,
  dateTimeInputToIso,
  isoToDateInput,
  isoToDateTimeInput,
  isStepReachable,
  parseOptionalNumber,
  parseStep,
  resumeStep,
} from './wizardHelpers';

describe('datetime-local conversion', () => {
  it('round-trips a local datetime input value through ISO', () => {
    const iso = dateTimeInputToIso('2025-11-20T17:00');
    expect(iso).not.toBe('');
    expect(isoToDateTimeInput(iso)).toBe('2025-11-20T17:00');
    expect(new Date(iso).getHours()).toBe(17);
  });

  it('formats an ISO instant in local time', () => {
    const local = new Date(2025, 10, 5, 8, 7);
    expect(isoToDateTimeInput(local.toISOString())).toBe('2025-11-05T08:07');
    expect(isoToDateInput(local.toISOString())).toBe('2025-11-05');
  });

  it('turns a date input into 17:00 local by default', () => {
    const iso = dateInputToIso('2025-12-05');
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2025, 11, 5, 17]);
    expect(isoToDateInput(iso)).toBe('2025-12-05');
  });

  it('returns empty strings for empty or invalid values', () => {
    expect(dateTimeInputToIso('')).toBe('');
    expect(dateTimeInputToIso('20/11/2025')).toBe('');
    expect(dateInputToIso(undefined)).toBe('');
    expect(isoToDateTimeInput('not a date')).toBe('');
    expect(isoToDateInput(null)).toBe('');
  });
});

describe('wizard step helpers', () => {
  it('parses valid steps only', () => {
    expect(parseStep('1')).toBe(1);
    expect(parseStep('4')).toBe(4);
    expect(parseStep('5')).toBeNull();
    expect(parseStep(undefined)).toBeNull();
  });

  it('resumes a draft at the first unfinished step', () => {
    expect(resumeStep(0)).toBe(1);
    expect(resumeStep(2)).toBe(3);
    expect(resumeStep(4)).toBe(4);
  });

  it('allows navigating only to done steps and the next one', () => {
    expect(isStepReachable(2, 1)).toBe(true);
    expect(isStepReachable(3, 1)).toBe(false);
  });

  it('parses optional numbers', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('40000000')).toBe(40_000_000);
    expect(parseOptionalNumber('abc')).toBeUndefined();
    expect(parseOptionalNumber(12)).toBe(12);
  });
});

describe('RFQ list helpers', () => {
  it('escapes CSV fields', () => {
    expect(toCsv([['a', 'b,c'], ['say "hi"', 3]])).toBe('﻿a,"b,c"\r\n"say ""hi""",3');
  });

  it('paginates in memory', () => {
    expect(paginateLocal([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });
});
