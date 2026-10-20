import type { Quotation, Rfq } from './types';

/** SUP-06 Hiệu suất trúng thầu, computed from the supplier's own invitations and quotations. */
export interface SupplierPerformance {
  rfqsReceived: number;
  quotesSubmitted: number;
  responseRate: number;
  awarded: number;
  notSelected: number;
  pending: number;
  winRate: number;
  avgResponseHours: number;
  monthly: { month: string; submitted: number; awarded: number }[];
  lossReasons: { key: LossReason; count: number }[];
}

export type LossReason = 'price' | 'leadTime' | 'moq' | 'other';

export function classifyLoss(feedback: string | undefined): LossReason {
  const f = (feedback ?? '').toLowerCase();
  if (/giá|price/.test(f)) return 'price';
  if (/lead time|giao hàng|thời gian/.test(f)) return 'leadTime';
  if (/moq|số lượng/.test(f)) return 'moq';
  return 'other';
}

export function supplierPerformance(supplierId: string, rfqs: Rfq[], quotations: Quotation[], months: string[]): SupplierPerformance {
  const invitedRfqs = rfqs.filter((r) => r.lifecycle !== 'draft' && r.invitations.some((i) => i.supplierId === supplierId));
  const mine = quotations.filter((q) => q.supplierId === supplierId && q.status !== 'draft');
  const submitted = mine.filter((q) => q.status !== 'withdrawn');
  const awarded = submitted.filter((q) => q.status === 'awarded');
  const notSelected = submitted.filter((q) => q.status === 'not_selected');
  const decided = awarded.length + notSelected.length;

  const responseHours = submitted
    .map((q) => {
      const inv = invitedRfqs.find((r) => r.id === q.rfqId)?.invitations.find((i) => i.supplierId === supplierId);
      return inv && q.submittedAt ? (new Date(q.submittedAt).getTime() - new Date(inv.sentAt).getTime()) / 3_600_000 : null;
    })
    .filter((h): h is number => h !== null && h >= 0);

  const monthKey = (iso: string) => iso.slice(0, 7);
  const lossCounts = new Map<LossReason, number>();
  for (const q of notSelected) {
    const reason = classifyLoss(q.buyerFeedback);
    lossCounts.set(reason, (lossCounts.get(reason) ?? 0) + 1);
  }

  return {
    rfqsReceived: invitedRfqs.length,
    quotesSubmitted: submitted.length,
    responseRate: invitedRfqs.length ? submitted.length / invitedRfqs.length : 0,
    awarded: awarded.length,
    notSelected: notSelected.length,
    pending: submitted.length - decided,
    winRate: submitted.length ? awarded.length / submitted.length : 0,
    avgResponseHours: responseHours.length ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : 0,
    monthly: months.map((m) => ({
      month: m,
      submitted: submitted.filter((q) => q.submittedAt && monthKey(q.submittedAt) === m).length,
      awarded: awarded.filter((q) => q.submittedAt && monthKey(q.submittedAt) === m).length,
    })),
    lossReasons: (['price', 'leadTime', 'moq', 'other'] as LossReason[]).map((key) => ({ key, count: lossCounts.get(key) ?? 0 })),
  };
}

/** Anonymous price rank among all active quotes for the RFQ: 1 = cheapest. Never exposes competitors. */
export function anonymousPriceRank(quotation: Quotation, allQuotesForRfq: Quotation[]): { rank: number; of: number } {
  const prices = allQuotesForRfq.map((q) => q.unitPrice).sort((a, b) => a - b);
  return { rank: prices.indexOf(quotation.unitPrice) + 1, of: prices.length };
}
