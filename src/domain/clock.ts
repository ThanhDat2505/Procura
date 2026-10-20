/**
 * Single source of "now" for business rules.
 *
 * The approved Stitch designs are anchored on 18/11/2025 (RFQ-2025-089 closes 20/11/2025, "Còn 2 ngày").
 * In mock mode the clock starts at that anchor and then advances in real time, so countdowns and
 * deadlines stay consistent with the designs. Against a real backend, call `useRealClock()`.
 */
export const DEMO_ANCHOR = new Date('2025-11-18T09:30:00+07:00').getTime();

let startedAt = Date.now();
let anchor: number | null = DEMO_ANCHOR;

export const clock = {
  now(): Date {
    return anchor === null ? new Date() : new Date(anchor + (Date.now() - startedAt));
  },
  nowIso(): string {
    return clock.now().toISOString();
  },
};

/** Restart the demo clock at a given offset from the anchor (used when the mock DB is restored). */
export function resumeDemoClock(elapsedMs: number): void {
  anchor = DEMO_ANCHOR;
  startedAt = Date.now() - elapsedMs;
}

export function demoElapsedMs(): number {
  return anchor === null ? 0 : Date.now() - startedAt;
}

export function useRealClock(): void {
  anchor = null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date | string, days: number): Date {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(from);
  const b = new Date(to);
  const startA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const startB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startB - startA) / DAY_MS);
}

export function hoursBetween(from: Date | string, to: Date | string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / (60 * 60 * 1000);
}
