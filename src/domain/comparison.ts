import { addDays } from './clock';
import type { EvaluationWeights, Quotation, Rfq, Supplier } from './types';

/**
 * Quotation comparison (BUY-08). Pure and deterministic: the "recommendation" is a transparent
 * weighted score using the buyer's evaluation weights from step 3 of the RFQ wizard.
 */

export interface ComparisonScores {
  price: number;
  leadTime: number;
  moq: number;
  quality: number;
}

export interface ComparedQuote {
  quotation: Quotation;
  supplier: Supplier;
  /** Quantity the buyer would actually have to order (max of requested quantity and supplier MOQ). */
  effectiveQuantity: number;
  /** Total for the effective quantity. */
  total: number;
  moqFit: boolean;
  /** Extra units forced by the MOQ (0 when it fits). */
  moqExcess: number;
  withinBudget: boolean | null;
  certCoverage: number;
  missingCertifications: string[];
  paymentFlexibility: PaymentFlexibility;
  validUntil: string;
  scores: ComparisonScores;
  /** 0–100 weighted score. */
  score: number;
  rank: number;
  flags: {
    lowestUnitPrice: boolean;
    lowestTotal: boolean;
    fastest: boolean;
    mostFlexiblePayment: boolean;
    longestValidity: boolean;
    recommended: boolean;
  };
}

export interface ComparisonResult {
  rows: ComparedQuote[];
  recommended: ComparedQuote | null;
  /** Lowest total among quotes whose MOQ fits the requested quantity. */
  bestBudget: ComparedQuote | null;
  fastest: ComparedQuote | null;
  mostFlexiblePayment: ComparedQuote | null;
  lowestUnitPrice: ComparedQuote | null;
}

/** 3 = buyer pays after delivery (credit terms), 2 = partial advance, 1 = full prepayment. */
export type PaymentFlexibility = 1 | 2 | 3;

export function paymentFlexibility(terms: string): PaymentFlexibility {
  const t = terms.toLowerCase();
  if (t.includes('100%')) return 1;
  if (/(tạm ứng|đặt cọc|advance|deposit)/.test(t)) return 2;
  if (/(công nợ|net\s?\d+|sau khi|after)/.test(t)) return 3;
  return 2;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function compareQuotations(rfq: Rfq, quotations: Quotation[], suppliers: Supplier[], weights: EvaluationWeights = rfq.terms.weights): ComparisonResult {
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const base = quotations
    .filter((q) => byId.has(q.supplierId))
    .map((quotation) => {
      const supplier = byId.get(quotation.supplierId)!;
      const effectiveQuantity = Math.max(rfq.quantity, quotation.moq);
      const total = quotation.unitPrice * effectiveQuantity;
      const certs = new Set([...supplier.certifications, ...quotation.certifications].map(normalizeCert));
      const required = rfq.terms.requiredCertifications;
      const missingCertifications = required.filter((c) => !certs.has(normalizeCert(c)));
      const certCoverage = required.length === 0 ? 1 : (required.length - missingCertifications.length) / required.length;
      return {
        quotation,
        supplier,
        effectiveQuantity,
        total,
        moqFit: quotation.moq <= rfq.quantity,
        moqExcess: Math.max(0, quotation.moq - rfq.quantity),
        withinBudget: rfq.budgetMax ? total <= rfq.budgetMax : null,
        certCoverage,
        missingCertifications,
        paymentFlexibility: paymentFlexibility(quotation.paymentTerms),
        validUntil: addDays(quotation.submittedAt ?? quotation.createdAt, quotation.validityDays).toISOString(),
      };
    });

  if (base.length === 0) {
    return { rows: [], recommended: null, bestBudget: null, fastest: null, mostFlexiblePayment: null, lowestUnitPrice: null };
  }

  const minTotal = Math.min(...base.map((r) => r.total));
  const minLead = Math.min(...base.map((r) => r.quotation.leadTimeDays));
  const minUnit = Math.min(...base.map((r) => r.quotation.unitPrice));
  const maxPay = Math.max(...base.map((r) => r.paymentFlexibility));
  const maxValidity = Math.max(...base.map((r) => r.quotation.validityDays));
  const weightSum = weights.price + weights.leadTime + weights.moq + weights.quality || 1;

  const scored = base.map((r) => {
    const scores: ComparisonScores = {
      price: round2(minTotal / r.total),
      leadTime: round2(minLead / Math.max(1, r.quotation.leadTimeDays)),
      moq: round2(r.moqFit ? 1 : rfq.quantity / r.quotation.moq),
      quality: round2(0.5 * (r.supplier.rating / 5) + 0.5 * r.certCoverage),
    };
    const score = Math.round(
      ((scores.price * weights.price + scores.leadTime * weights.leadTime + scores.moq * weights.moq + scores.quality * weights.quality) / weightSum) * 100,
    );
    return { ...r, scores, score };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score || a.total - b.total);
  const recommendedId = ranked[0].quotation.id;
  const fitting = scored.filter((r) => r.moqFit);
  const bestBudgetId = fitting.length ? fitting.reduce((a, b) => (b.total < a.total ? b : a)).quotation.id : null;

  const rows: ComparedQuote[] = scored.map((r) => ({
    ...r,
    rank: ranked.findIndex((x) => x.quotation.id === r.quotation.id) + 1,
    flags: {
      lowestUnitPrice: r.quotation.unitPrice === minUnit,
      lowestTotal: r.quotation.id === bestBudgetId,
      fastest: r.quotation.leadTimeDays === minLead,
      mostFlexiblePayment: r.paymentFlexibility === maxPay,
      longestValidity: r.quotation.validityDays === maxValidity,
      recommended: r.quotation.id === recommendedId,
    },
  }));

  const pick = (pred: (r: ComparedQuote) => boolean) => rows.find(pred) ?? null;
  return {
    rows,
    recommended: pick((r) => r.flags.recommended),
    bestBudget: pick((r) => r.flags.lowestTotal),
    fastest: pick((r) => r.flags.fastest),
    mostFlexiblePayment: pick((r) => r.flags.mostFlexiblePayment),
    lowestUnitPrice: pick((r) => r.flags.lowestUnitPrice),
  };
}

function normalizeCert(c: string): string {
  return c.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/2015$/, '');
}
