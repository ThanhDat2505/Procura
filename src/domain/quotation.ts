import { z } from 'zod';
import { addDays } from './clock';
import { isPastDeadline } from './rfq';
import type { Quotation, Rfq } from './types';

/** SUP-02/SUP-04 quotation form. Messages are i18n keys in the `common` namespace. */
export const quotationFormSchema = z.object({
  unitPrice: z.coerce.number({ invalid_type_error: 'validation.number' }).positive('validation.positive'),
  moq: z.coerce.number({ invalid_type_error: 'validation.number' }).int('validation.integer').positive('validation.positive'),
  leadTimeDays: z.coerce.number({ invalid_type_error: 'validation.number' }).int('validation.integer').positive('validation.positive'),
  validityDays: z.coerce.number().int().positive(),
  paymentTerms: z.string().min(1, 'validation.required'),
  offerNotes: z.string().max(1000).optional().default(''),
  toolingCost: z.coerce.number().min(0).optional().default(0),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export const VALIDITY_OPTIONS = [15, 30, 45, 60] as const;

export function quotationTotal(unitPrice: number, quantity: number, moq: number): number {
  return unitPrice * Math.max(quantity, moq);
}

export function quotationValidUntil(q: Pick<Quotation, 'submittedAt' | 'createdAt' | 'validityDays'>): Date {
  return addDays(q.submittedAt ?? q.createdAt, q.validityDays);
}

/** Suppliers may edit or withdraw a submitted quotation until the RFQ deadline, unless already decided. */
export function canEditQuotation(q: Quotation, rfq: Rfq, now: Date): boolean {
  if (rfq.lifecycle !== 'open' || isPastDeadline(rfq, now)) return false;
  return q.status === 'draft' || q.status === 'submitted' || q.status === 'viewed';
}

export function canWithdrawQuotation(q: Quotation, rfq: Rfq, now: Date): boolean {
  return (q.status === 'submitted' || q.status === 'viewed') && canEditQuotation(q, rfq, now);
}

/** Supplier-side progress stepper on SUP-04b: Đã gửi → Người mua đã xem → Chờ kết quả → Kết quả. */
export function quotationProgressStep(q: Quotation): 1 | 2 | 3 | 4 {
  if (q.status === 'awarded' || q.status === 'not_selected') return 4;
  if (q.status === 'viewed') return 3;
  return q.status === 'submitted' ? 2 : 1;
}

/** Vietnamese words for amounts: "Bốn mươi hai triệu năm trăm nghìn đồng" (SUP-02/04). */
export function vndToWords(amount: number): string {
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const readTriple = (n: number, full: boolean): string => {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    const out: string[] = [];
    if (h > 0 || full) out.push(`${digits[h]} trăm`);
    if (t > 1) out.push(`${digits[t]} mươi`);
    else if (t === 1) out.push('mười');
    else if (u > 0 && (h > 0 || full)) out.push('lẻ');
    if (u > 0) {
      if (u === 1 && t > 1) out.push('mốt');
      else if (u === 5 && t > 0) out.push('lăm');
      else out.push(digits[u]);
    }
    return out.join(' ');
  };
  const n = Math.round(amount);
  if (n === 0) return 'Không đồng';
  const units = ['', ' nghìn', ' triệu', ' tỷ'];
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    words.push(readTriple(groups[i], i < groups.length - 1) + units[i % 4] + (i >= 4 ? ' tỷ' : ''));
  }
  const text = words.join(' ').replace(/\s+/g, ' ').trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
