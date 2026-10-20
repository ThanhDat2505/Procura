/**
 * Pure helpers for the RFQ wizard (BUY-06 → 06d).
 * Native `datetime-local` / `date` inputs work in the browser's local time zone (Vietnam for our users),
 * while the API stores ISO-8601 instants. These convert between the two without shifting the time.
 */

const pad = (n: number) => String(n).padStart(2, '0');

function validDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO instant → "YYYY-MM-DDTHH:mm" (local) for `<input type="datetime-local">`. */
export function isoToDateTimeInput(iso: string | undefined | null): string {
  const d = validDate(iso);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (local) → ISO instant; '' when empty or invalid. */
export function dateTimeInputToIso(value: string | undefined | null): string {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** ISO instant → "YYYY-MM-DD" (local) for `<input type="date">`. */
export function isoToDateInput(iso: string | undefined | null): string {
  return isoToDateTimeInput(iso).slice(0, 10);
}

/** "YYYY-MM-DD" (local) → ISO instant at `hour`:00 local time (17:00 = end of business day). */
export function dateInputToIso(value: string | undefined | null, hour = 17): string {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Parses a number typed into a form field; empty / invalid → undefined. */
export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[.\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export const WIZARD_STEPS = [1, 2, 3, 4] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function parseStep(raw: string | undefined): WizardStep | null {
  const n = Number(raw);
  return (WIZARD_STEPS as readonly number[]).includes(n) ? (n as WizardStep) : null;
}

/** A step in the stepper is reachable when it is already done or the next one to do. */
export function isStepReachable(step: number, completedStep: number): boolean {
  return step <= completedStep + 1;
}

/** Step to resume a draft at: the first step not yet completed (1–4). */
export function resumeStep(completedStep: number): WizardStep {
  return Math.min(4, Math.max(1, completedStep + 1)) as WizardStep;
}
