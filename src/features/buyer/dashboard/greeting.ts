export type DayPeriod = 'morning' | 'afternoon' | 'evening';

/** "Chào buổi sáng / chiều / tối": morning until 11:59, afternoon until 17:59, evening otherwise. */
export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** Average response time label parts: hours below one day, otherwise days. */
export function responseTimeParts(hours: number): { unit: 'hours' | 'days'; value: number } {
  return hours < 24 ? { unit: 'hours', value: Math.round(hours * 10) / 10 } : { unit: 'days', value: Math.round((hours / 24) * 10) / 10 };
}
