import { z } from 'zod';
import { daysBetween, hoursBetween } from './clock';
import type { EvaluationWeights, Quotation, Rfq, RfqDisplayStatus } from './types';

export const MAX_SUPPLIERS_PER_RFQ = 10;
/** Comparison needs at least this many submitted quotations. */
export const MIN_QUOTES_TO_COMPARE = 2;

const ACTIVE_QUOTE_STATUSES = new Set<Quotation['status']>(['submitted', 'viewed', 'awarded', 'not_selected']);

export function isActiveQuote(q: Quotation): boolean {
  return ACTIVE_QUOTE_STATUSES.has(q.status);
}

export function quotesForRfq(rfqId: string, quotations: Quotation[]): Quotation[] {
  return quotations.filter((q) => q.rfqId === rfqId && isActiveQuote(q));
}

export function isPastDeadline(rfq: Pick<Rfq, 'deadline'>, now: Date): boolean {
  return new Date(rfq.deadline).getTime() <= now.getTime();
}

/**
 * Display status used by badges, tabs and filters.
 * - open with 0 quotes → "Đang mở"; 1 quote → "Chờ báo giá"; ≥2 → "Đã có báo giá" (comparable)
 * - past deadline without any quote → "Hết hạn"
 */
export function rfqDisplayStatus(rfq: Rfq, quoteCount: number, now: Date): RfqDisplayStatus {
  switch (rfq.lifecycle) {
    case 'draft':
      return 'draft';
    case 'awarded':
      return 'awarded';
    case 'cancelled':
      return 'cancelled';
    case 'open':
      if (isPastDeadline(rfq, now) && quoteCount === 0) return 'expired';
      if (quoteCount >= MIN_QUOTES_TO_COMPARE) return 'quoted';
      if (quoteCount === 1) return 'awaiting';
      return 'open';
  }
}

export function canCompare(rfq: Rfq, quoteCount: number): boolean {
  return (rfq.lifecycle === 'open' || rfq.lifecycle === 'awarded') && quoteCount >= MIN_QUOTES_TO_COMPARE;
}

export function canAward(rfq: Rfq, quoteCount: number): boolean {
  return rfq.lifecycle === 'open' && quoteCount >= 1;
}

export type DeadlineUrgency = 'overdue' | 'today' | 'soon' | 'normal';

export interface DeadlineInfo {
  daysLeft: number;
  hoursLeft: number;
  urgency: DeadlineUrgency;
}

/** "Còn 2 ngày" (soon ≤ 3 days, red), "Hôm nay", "Đã hết hạn". */
export function deadlineInfo(deadline: string, now: Date): DeadlineInfo {
  const hoursLeft = hoursBetween(now, deadline);
  const daysLeft = daysBetween(now, deadline);
  let urgency: DeadlineUrgency = 'normal';
  if (hoursLeft <= 0) urgency = 'overdue';
  else if (daysLeft === 0) urgency = 'today';
  else if (daysLeft <= 3) urgency = 'soon';
  return { daysLeft, hoursLeft, urgency };
}

export function invitationStats(rfq: Rfq, quotations: Quotation[]) {
  const quotes = quotesForRfq(rfq.id, quotations);
  return {
    invited: rfq.invitations.length,
    viewed: rfq.invitations.filter((i) => i.viewedAt).length,
    declined: rfq.invitations.filter((i) => i.declinedAt).length,
    quoted: quotes.length,
  };
}

// ---------------------------------------------------------------------------
// Wizard validation (BUY-06 → BUY-06d). Schemas are reused by the forms.
// ---------------------------------------------------------------------------

export const rfqStep1Schema = z.object({
  title: z.string().trim().min(10, 'validation.titleMin').max(160, 'validation.titleMax'),
  categoryId: z.string().min(1, 'validation.required'),
  subcategory: z.string().min(1, 'validation.required'),
  productName: z.string().trim().min(3, 'validation.required'),
  dimensions: z.string().trim().optional().default(''),
  material: z.string().trim().optional().default(''),
  finishing: z.string().trim().optional().default(''),
  quantity: z.coerce.number({ invalid_type_error: 'validation.number' }).int('validation.integer').positive('validation.positive'),
  unit: z.string().min(1, 'validation.required'),
  deliveryAddress: z.string().trim().min(5, 'validation.required'),
  deadline: z.string().min(1, 'validation.required'),
  neededBy: z.string().min(1, 'validation.required'),
});
export type RfqStep1Values = z.infer<typeof rfqStep1Schema>;

/** Length, width and height in cm, as typed (strings so a blank field stays blank). */
export interface Dimensions {
  length: string;
  width: string;
  height: string;
}

const DIMENSIONS_RE = /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i;

/**
 * Splits free text such as "25×18×10 cm, Kraft 140gsm" into L/W/H and the remaining text.
 * `dimensions` is null when the text has no "L x W x H" group.
 */
export function splitDimensions(text: string): { dimensions: Dimensions | null; rest: string } {
  const m = text.match(DIMENSIONS_RE);
  if (!m) return { dimensions: null, rest: text.trim() };
  const rest = (text.slice(0, m.index) + text.slice(m.index! + m[0].length)).replace(/^[\s,;·-]+|[\s,;·-]+$/g, '');
  return { dimensions: { length: m[1], width: m[2], height: m[3] }, rest };
}

/** "25 × 18 × 10 cm" – the format stored on the RFQ; '' when nothing was entered. */
export function formatDimensions({ length, width, height }: Dimensions): string {
  const parts = [length, width, height].map((p) => p.trim());
  return parts.every((p) => p === '') ? '' : `${parts.join(' × ')} cm`;
}

/**
 * The three size fields are optional together: all blank, or all positive numbers.
 * Returns the first offending side and its validation key.
 */
export function dimensionsError(dims: Dimensions): { side: keyof Dimensions; message: string } | undefined {
  const sides = ['length', 'width', 'height'] as const;
  const value = (s: keyof Dimensions) => dims[s].trim();
  if (sides.every((s) => value(s) === '')) return undefined;
  const blank = sides.find((s) => value(s) === '');
  if (blank) return { side: blank, message: 'validation.dimensionsIncomplete' };
  const invalid = sides.find((s) => !(Number(value(s).replace(',', '.')) > 0));
  if (invalid) return { side: invalid, message: 'validation.positive' };
  return undefined;
}

export function validateDates(values: { deadline: string; neededBy: string }, now: Date): { deadline?: string; neededBy?: string } {
  const errors: { deadline?: string; neededBy?: string } = {};
  if (values.deadline && new Date(values.deadline).getTime() <= now.getTime()) errors.deadline = 'validation.deadlineFuture';
  if (values.deadline && values.neededBy && new Date(values.neededBy).getTime() <= new Date(values.deadline).getTime()) {
    errors.neededBy = 'validation.neededAfterDeadline';
  }
  return errors;
}

export const rfqStep2Schema = z.object({
  supplierIds: z.array(z.string()).min(1, 'validation.minSuppliers').max(MAX_SUPPLIERS_PER_RFQ, 'validation.maxSuppliers'),
});

export const weightsSchema = z
  .object({ price: z.number().min(0).max(100), leadTime: z.number().min(0).max(100), moq: z.number().min(0).max(100), quality: z.number().min(0).max(100) })
  .refine((w) => weightsTotal(w) === 100, { message: 'validation.weightsTotal' });

export const rfqStep3Schema = z.object({
  vatIncluded: z.boolean(),
  paymentTerms: z.string().min(1, 'validation.required'),
  minValidityDays: z.coerce.number().int().positive(),
  sampleRequired: z.boolean(),
  sampleQuantity: z.coerce.number().int().min(0),
  sampleNote: z.string().optional().default(''),
  requiredCertifications: z.array(z.string()),
  weights: weightsSchema,
  notesToSuppliers: z.string().optional().default(''),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
});
export type RfqStep3Values = z.infer<typeof rfqStep3Schema>;

export function weightsTotal(w: EvaluationWeights): number {
  return Math.round(w.price + w.leadTime + w.moq + w.quality);
}

export interface ReadinessCheck {
  key: 'specs' | 'attachments' | 'suppliers' | 'terms' | 'weights' | 'deadline';
  ok: boolean;
}

/** BUY-06d "Kiểm tra trước khi gửi" checklist. Attachments are recommended, not required. */
export function readinessChecks(rfq: Rfq, now: Date): ReadinessCheck[] {
  const step1 = rfqStep1Schema.safeParse(rfq);
  const dateErrors = validateDates(rfq, now);
  return [
    { key: 'specs', ok: step1.success },
    { key: 'attachments', ok: rfq.attachments.length > 0 },
    { key: 'suppliers', ok: rfq.invitations.length >= 1 && rfq.invitations.length <= MAX_SUPPLIERS_PER_RFQ },
    { key: 'terms', ok: rfq.terms.paymentTerms.length > 0 },
    { key: 'weights', ok: weightsTotal(rfq.terms.weights) === 100 },
    { key: 'deadline', ok: !dateErrors.deadline && !dateErrors.neededBy },
  ];
}

export function canSend(rfq: Rfq, now: Date): boolean {
  return rfq.lifecycle === 'draft' && readinessChecks(rfq, now).every((c) => c.ok || c.key === 'attachments');
}

export const DEFAULT_WEIGHTS: EvaluationWeights = { price: 40, leadTime: 25, moq: 15, quality: 20 };
