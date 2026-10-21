import type { z } from 'zod';
import { PAYMENT_TERM_OPTIONS } from '@/domain/catalog';
import { canEditQuotation, validityOptionsFor, type quotationFormSchema } from '@/domain/quotation';
import { isPastDeadline } from '@/domain/rfq';
import type { Quotation, Rfq } from '@/domain/types';

/** Raw form state (before zod coercion / defaults). */
export type QuotationFormInput = z.input<typeof quotationFormSchema>;

/**
 * How the SUP-02/04 page behaves:
 * - `new`: first quotation for this RFQ
 * - `drafting`: a saved draft exists
 * - `editingSubmitted`: a submitted quotation is being changed before the deadline (re-submits it)
 * - `readOnly`: nothing can be changed any more (`reason` explains why)
 */
export type QuoteMode = 'new' | 'drafting' | 'editingSubmitted' | 'readOnly';
export type ReadOnlyReason = 'closed' | 'expired' | 'declined' | 'locked';

export interface QuoteModeInfo {
  mode: QuoteMode;
  reason?: ReadOnlyReason;
}

export function quoteMode(view: { rfq: Rfq; quotation?: Quotation; declined: boolean }, now: Date): QuoteModeInfo {
  const { rfq, quotation, declined } = view;
  if (rfq.lifecycle !== 'open') return { mode: 'readOnly', reason: 'closed' };
  if (isPastDeadline(rfq, now)) return { mode: 'readOnly', reason: 'expired' };
  if (quotation && !canEditQuotation(quotation, rfq, now)) return { mode: 'readOnly', reason: 'locked' };
  if (declined && (!quotation || quotation.status === 'draft')) return { mode: 'readOnly', reason: 'declined' };
  if (!quotation) return { mode: 'new' };
  return { mode: quotation.status === 'draft' ? 'drafting' : 'editingSubmitted' };
}

export type MoqCheck = 'empty' | 'fits' | 'exceeds';

/** Live check under the MOQ field: does the offered MOQ cover the requested quantity? */
export function moqCheck(moq: number | undefined, quantity: number): MoqCheck {
  if (moq === undefined || !Number.isFinite(moq) || moq <= 0) return 'empty';
  return moq <= quantity ? 'fits' : 'exceeds';
}

/** Adds working days (Mon–Fri) to a date, used for "Dự kiến giao hàng vào". */
export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return d;
}

/** Payment term choices: the catalogue plus the buyer's and the saved quotation's own wording. */
export function paymentTermOptions(buyerTerms: string, current?: string): string[] {
  const list: string[] = [];
  for (const term of [buyerTerms, current, ...PAYMENT_TERM_OPTIONS]) {
    if (term && !list.includes(term)) list.push(term);
  }
  return list;
}

/** Smallest validity option that satisfies the buyer's minimum. */
export function defaultValidityDays(minValidityDays: number): number {
  return validityOptionsFor(minValidityDays)[0];
}

/** Prefill from the existing quotation (draft or submitted) or from the buyer's terms. */
export function defaultFormValues(rfq: Rfq, quotation?: Quotation): Partial<QuotationFormInput> {
  const positive = (v: number | undefined) => (v && v > 0 ? v : undefined);
  return {
    unitPrice: positive(quotation?.unitPrice),
    moq: positive(quotation?.moq),
    leadTimeDays: positive(quotation?.leadTimeDays),
    // An older quotation below the buyer's minimum is bumped to the first allowed option.
    validityDays:
      quotation && quotation.validityDays >= rfq.terms.minValidityDays ? quotation.validityDays : defaultValidityDays(rfq.terms.minValidityDays),
    paymentTerms: quotation?.paymentTerms || rfq.terms.paymentTerms,
    offerNotes: quotation?.offerNotes ?? '',
    toolingCost: quotation?.toolingCost ?? 0,
  };
}

/** Draft payload: drops empty / NaN numbers so a half-filled form can still be saved. */
export function draftPayload(values: Partial<QuotationFormInput>): Partial<QuotationFormInput> {
  const out: Partial<QuotationFormInput> = {};
  for (const [key, value] of Object.entries(values) as [keyof QuotationFormInput, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
