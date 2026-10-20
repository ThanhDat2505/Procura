import { MIN_QUOTES_TO_COMPARE } from '@/domain/rfq';
import { quotationTotal } from '@/domain/quotation';
import type { ID, ISODate, Quotation, SupplierSummary } from '@/domain/types';
import type { InvitationView, RfqDetail } from '@/services';

/**
 * Pure view-model helpers for BUY-07 (RFQ detail & progress). No React, no i18n: the page maps the
 * returned keys/values to translated strings.
 */

// ---------------------------------------------------------------------------
// Response summary ("Đã nhận 3/4 báo giá")
// ---------------------------------------------------------------------------

export interface ResponseSummary {
  invited: number;
  viewed: number;
  declined: number;
  /** Invitees that have not declined: the number of quotes we can still expect. */
  expected: number;
  received: number;
  /** Every non-declined invitee has answered. */
  complete: boolean;
  canCompare: boolean;
}

export function responseSummary(detail: Pick<RfqDetail, 'invitations' | 'quotations'>): ResponseSummary {
  const invited = detail.invitations.length;
  const declined = detail.invitations.filter((i) => i.declinedAt && !i.quotation).length;
  const viewed = detail.invitations.filter((i) => i.viewedAt || i.quotation).length;
  const received = detail.quotations.length;
  const expected = Math.max(received, invited - declined);
  return {
    invited,
    viewed,
    declined,
    expected,
    received,
    complete: expected > 0 && received >= expected,
    canCompare: received >= MIN_QUOTES_TO_COMPARE,
  };
}

// ---------------------------------------------------------------------------
// Timeline ("Tiến độ quy trình RFQ")
// ---------------------------------------------------------------------------

export type TimelineState = 'done' | 'current' | 'pending' | 'cancelled';
export type TimelineKey = 'published' | 'viewed' | 'quotes' | 'decision';

export interface TimelineStep {
  key: TimelineKey;
  state: TimelineState;
  at?: ISODate;
  /** Variant used to pick the translation (e.g. draft / waiting / awarded). */
  variant: string;
  values: Record<string, string | number>;
}

export interface Timeline {
  steps: TimelineStep[];
  /** 1-based step shown in the "Bước x / 4" chip. */
  currentStep: number;
  total: number;
}

const latest = (dates: (string | undefined)[]): string | undefined =>
  dates.filter((d): d is string => Boolean(d)).sort((a, b) => b.localeCompare(a))[0];

/** Derives the 4-step progress from `rfq.events`, invitations and quotations. No PO/contract steps. */
export function buildRfqTimeline(detail: RfqDetail): Timeline {
  const { rfq } = detail;
  const summary = responseSummary(detail);
  const sent = rfq.lifecycle !== 'draft';
  const awarded = rfq.lifecycle === 'awarded';
  const cancelled = rfq.lifecycle === 'cancelled';

  const sentEvent = rfq.events.find((e) => e.type === 'sent');
  const publishedAt = sentEvent?.at ?? rfq.sentAt ?? rfq.createdAt;
  const lastViewedAt = latest([...detail.invitations.map((i) => i.viewedAt), ...rfq.events.filter((e) => e.type === 'viewed').map((e) => e.at)]);
  const quoteEvents = rfq.events.filter((e) => e.type === 'quote_received');
  const lastQuote = [...detail.quotations].sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))[0];
  const lastQuoteAt = latest([...quoteEvents.map((e) => e.at), lastQuote?.submittedAt]);
  const winner = awarded ? detail.quotations.find((q) => q.id === rfq.awardedQuotationId) : undefined;

  const published: TimelineStep = {
    key: 'published',
    state: sent ? 'done' : 'current',
    at: sent ? publishedAt : rfq.createdAt,
    variant: sent ? 'done' : 'draft',
    values: { count: summary.invited },
  };

  const viewedDone = sent && (summary.viewed > 0 || summary.received > 0);
  const viewed: TimelineStep = {
    key: 'viewed',
    state: viewedDone ? 'done' : sent && !cancelled ? 'current' : 'pending',
    at: viewedDone ? lastViewedAt : undefined,
    variant: viewedDone ? 'done' : 'waiting',
    values: { viewed: summary.viewed, invited: summary.invited, declined: summary.declined },
  };

  const quotesState: TimelineState = !viewedDone ? 'pending' : awarded ? 'done' : cancelled ? 'done' : 'current';
  const quotes: TimelineStep = {
    key: 'quotes',
    state: summary.received === 0 && quotesState === 'done' ? 'pending' : quotesState,
    at: summary.received > 0 ? lastQuoteAt : undefined,
    variant: summary.received === 0 ? 'none' : summary.complete ? 'complete' : 'partial',
    values: { received: summary.received, expected: summary.expected, supplier: lastQuote?.supplier.shortName ?? '' },
  };

  const decision: TimelineStep = cancelled
    ? { key: 'decision', state: 'cancelled', at: rfq.events.find((e) => e.type === 'cancelled')?.at ?? rfq.updatedAt, variant: 'cancelled', values: {} }
    : awarded
      ? { key: 'decision', state: 'done', at: rfq.awardedAt, variant: 'awarded', values: { supplier: winner?.supplier.name ?? '' } }
      : { key: 'decision', state: 'pending', variant: 'pending', values: {} };

  const steps = [published, viewed, quotes, decision];
  const firstOpen = steps.findIndex((s) => s.state !== 'done');
  return { steps, currentStep: firstOpen === -1 ? steps.length : firstOpen + 1, total: steps.length };
}

// ---------------------------------------------------------------------------
// Quotation table
// ---------------------------------------------------------------------------

export type QuoteRow =
  | {
      kind: 'quote';
      supplier: SupplierSummary;
      quotation: Quotation;
      total: number;
      moqFit: boolean;
      lowestUnitPrice: boolean;
      fastest: boolean;
    }
  | { kind: 'pending' | 'declined'; supplier: SupplierSummary; invitation: InvitationView };

/** One row per invited supplier: quotes first (in submission order), then silent / declined invitees. */
export function buildQuoteRows(detail: RfqDetail): QuoteRow[] {
  const { rfq } = detail;
  const quotes = detail.quotations;
  const minUnit = quotes.length ? Math.min(...quotes.map((q) => q.unitPrice)) : 0;
  const minLead = quotes.length ? Math.min(...quotes.map((q) => q.leadTimeDays)) : 0;
  const quoteRows: QuoteRow[] = [...quotes]
    .sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt))
    .map((q) => ({
      kind: 'quote',
      supplier: q.supplier,
      quotation: q,
      total: quotationTotal(q.unitPrice, rfq.quantity, q.moq),
      moqFit: q.moq <= rfq.quantity,
      lowestUnitPrice: quotes.length > 1 && q.unitPrice === minUnit,
      fastest: quotes.length > 1 && q.leadTimeDays === minLead,
    }));
  const quotedIds = new Set(quotes.map((q) => q.supplierId));
  const others: QuoteRow[] = detail.invitations
    .filter((i) => !quotedIds.has(i.supplier.id))
    .map((invitation) => ({ kind: invitation.declinedAt ? 'declined' : 'pending', supplier: invitation.supplier, invitation }));
  return [...quoteRows, ...others];
}

/** "Bộ lọc giá & MOQ": keep only quotes whose MOQ fits the requested quantity. */
export function filterQuoteRows(rows: QuoteRow[], onlyMoqFit: boolean): QuoteRow[] {
  return onlyMoqFit ? rows.filter((r) => r.kind === 'quote' && r.moqFit) : rows;
}

/** Spread between the cheapest and the most expensive total of the selected quotes. */
export function totalSpread(rows: QuoteRow[], selected: Set<ID>): { amount: number; ratio: number } | null {
  const totals = rows.flatMap((r) => (r.kind === 'quote' && selected.has(r.quotation.id) ? [r.total] : []));
  if (totals.length < 2) return null;
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  return { amount: max - min, ratio: max === 0 ? 0 : (max - min) / max };
}
