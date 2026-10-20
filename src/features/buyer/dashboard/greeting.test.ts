import { dayPeriod, responseTimeParts } from './greeting';

describe('dayPeriod', () => {
  it.each([
    [9, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
    [2, 'evening'],
  ])('hour %i → %s', (hour, period) => {
    expect(dayPeriod(hour)).toBe(period);
  });
});

describe('responseTimeParts', () => {
  it('uses hours below a day and days otherwise', () => {
    expect(responseTimeParts(4.2)).toEqual({ unit: 'hours', value: 4.2 });
    expect(responseTimeParts(43.2)).toEqual({ unit: 'days', value: 1.8 });
  });
});
