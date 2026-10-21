import { clock, daysBetween } from '@/domain/clock';
import { anonymousPriceRank, supplierPerformance } from '@/domain/performance';
import { canEditQuotation, canWithdrawQuotation, quotationTotal } from '@/domain/quotation';
import { deadlineInfo, isPastDeadline, quotesForRfq } from '@/domain/rfq';
import type { Quotation, Rfq } from '@/domain/types';
import type { InboxItem, InboxTab, QuotationTab, SupplierPortalApi, SupplierRfqView } from '../contracts';
import { ApiError } from '../contracts';
import { read, write } from './accountApi';
import { db, nextId } from './db';
import { buyerOwner, currentUser, findRfq, findSupplier, notify, paginate } from './helpers';

function mySupplierId(): string {
  return currentUser('supplier').organizationId;
}

function buyerOf(rfq: Rfq) {
  const b = db.buyerCompanies.find((c) => c.id === rfq.buyerCompanyId);
  if (!b) throw new ApiError('errors.notFound', 'Buyer not found', 404);
  return b;
}

function invitedRfq(rfqId: string): Rfq {
  const rfq = findRfq(rfqId);
  if (rfq.lifecycle === 'draft' || !rfq.invitations.some((i) => i.supplierId === mySupplierId())) {
    throw new ApiError('errors.notFound', 'RFQ not found', 404);
  }
  return rfq;
}

function myQuotation(rfqId: string): Quotation | undefined {
  const sid = mySupplierId();
  return db.quotations.find((q) => q.rfqId === rfqId && q.supplierId === sid && q.status !== 'withdrawn');
}

function inboxTab(rfq: Rfq, quote: Quotation | undefined, declined: boolean): { tab: InboxTab; expired: boolean } {
  const expired = isPastDeadline(rfq, clock.now()) || rfq.lifecycle !== 'open';
  if (quote && quote.status !== 'draft') return { tab: rfq.lifecycle === 'open' ? 'submitted' : 'closed', expired };
  if (declined || expired) return { tab: 'closed', expired };
  if (quote?.status === 'draft') return { tab: 'drafting', expired };
  return { tab: 'new', expired };
}

function view(rfq: Rfq): SupplierRfqView {
  const owner = buyerOwner(rfq);
  const sid = mySupplierId();
  const products = db.products.filter((p) => p.supplierId === sid && (p.group === rfq.subcategory || rfq.productName.toLowerCase().includes(p.group.toLowerCase())));
  return {
    rfq,
    buyer: buyerOf(rfq),
    buyerContact: { name: owner.name, initials: owner.initials, title: owner.title, email: owner.email, phone: owner.phone },
    quotation: myQuotation(rfq.id),
    priceHint: products.length ? { min: Math.min(...products.map((p) => p.priceMin)), max: Math.max(...products.map((p) => p.priceMax)) } : undefined,
    declined: Boolean(rfq.invitations.find((i) => i.supplierId === sid)?.declinedAt),
  };
}

function upsertQuote(rfq: Rfq, values: Partial<Quotation>, status: 'draft' | 'submitted'): Quotation {
  const sid = mySupplierId();
  const now = clock.nowIso();
  let quote = myQuotation(rfq.id);
  if (quote && !canEditQuotation(quote, rfq, clock.now())) throw new ApiError('errors.quoteLocked', 'Quotation can no longer be edited', 409);
  if (!quote) {
    db.sequence.quotation += 1;
    const supplier = findSupplier(sid);
    quote = {
      id: nextId('qt'),
      code: `QT-2025-${String(db.sequence.quotation).padStart(4, '0')}`,
      rfqId: rfq.id,
      supplierId: sid,
      unitPrice: 0,
      moq: 0,
      leadTimeDays: 0,
      validityDays: 30,
      paymentTerms: rfq.terms.paymentTerms,
      samplePolicy: '',
      toolingCost: 0,
      offerNotes: '',
      vatIncluded: false,
      certifications: supplier.certificates.filter((c) => c.status === 'verified').map((c) => c.code),
      attachments: [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    db.quotations.push(quote);
  }
  const wasSubmitted = quote.status !== 'draft';
  Object.assign(quote, values, { updatedAt: now });
  if (status === 'submitted') {
    quote.status = 'submitted';
    quote.submittedAt = now;
    quote.viewedAt = undefined;
    rfq.events.push({ id: nextId('ev'), type: 'quote_received', at: now, supplierId: sid });
    notify(
      rfq.ownerId,
      'quote_received',
      `${findSupplier(sid).name} đã ${wasSubmitted ? 'cập nhật' : 'gửi'} báo giá`,
      `${rfq.code} · ${quote.unitPrice.toLocaleString('vi-VN')} đ/${rfq.unit} (Lead time ${quote.leadTimeDays} ngày)`,
      `/buyer/rfqs/${rfq.id}`,
    );
    const inv = rfq.invitations.find((i) => i.supplierId === sid);
    if (inv && !inv.viewedAt) inv.viewedAt = now;
  }
  return quote;
}

const QUOTATION_TABS: QuotationTab[] = ['all', 'pending', 'awarded', 'not_selected', 'closed'];

function quotationTab(q: Quotation): Exclude<QuotationTab, 'all'> {
  if (q.status === 'awarded') return 'awarded';
  if (q.status === 'not_selected') return 'not_selected';
  if (q.status === 'withdrawn' || q.status === 'expired') return 'closed';
  return 'pending';
}

export const portalApi: SupplierPortalApi = {
  inbox: ({ tab, query, sort }) =>
    read(() => {
      const sid = mySupplierId();
      const now = clock.now();
      const all: InboxItem[] = db.rfqs
        .filter((r) => r.lifecycle !== 'draft' && r.invitations.some((i) => i.supplierId === sid))
        .filter((r) => daysBetween(r.createdAt, now) <= 31)
        .map((rfq) => {
          const quotation = db.quotations.find((q) => q.rfqId === rfq.id && q.supplierId === sid);
          const declined = Boolean(rfq.invitations.find((i) => i.supplierId === sid)?.declinedAt);
          const active = quotation?.status === 'withdrawn' ? undefined : quotation;
          const { tab: itemTab, expired } = inboxTab(rfq, active, declined);
          return { rfq, buyer: buyerOf(rfq), tab: itemTab, quotation: active, declined, expired };
        });
      const q = query?.trim().toLowerCase();
      const filtered = all.filter((i) => !q || i.rfq.code.toLowerCase().includes(q) || i.rfq.title.toLowerCase().includes(q) || i.buyer.name.toLowerCase().includes(q));
      const counts = { new: 0, drafting: 0, submitted: 0, closed: 0 } as Record<InboxTab, number>;
      filtered.forEach((i) => (counts[i.tab] += 1));
      const items = filtered
        .filter((i) => i.tab === tab)
        .sort((a, b) => (sort === 'newest' ? b.rfq.createdAt.localeCompare(a.rfq.createdAt) : a.rfq.deadline.localeCompare(b.rfq.deadline)));
      const invitedRecent = all.length;
      const answered = all.filter((i) => i.quotation && i.quotation.status !== 'draft').length;
      return {
        items,
        counts,
        stats: {
          newThisWeek: all.filter((i) => daysBetween(i.rfq.createdAt, now) <= 7).length,
          drafting: counts.drafting,
          dueSoon: all.filter((i) => (i.tab === 'new' || i.tab === 'drafting') && ['soon', 'today'].includes(deadlineInfo(i.rfq.deadline, now).urgency)).length,
          responseRate: invitedRecent ? answered / invitedRecent : 0,
        },
      };
    }),

  rfq: (rfqId) =>
    write(() => {
      const rfq = invitedRfq(rfqId);
      const inv = rfq.invitations.find((i) => i.supplierId === mySupplierId())!;
      if (!inv.viewedAt) {
        inv.viewedAt = clock.nowIso();
        rfq.events.push({ id: nextId('ev'), type: 'viewed', at: inv.viewedAt, supplierId: inv.supplierId });
      }
      return view(rfq);
    }),

  saveQuotationDraft: (rfqId, values) => write(() => upsertQuote(invitedRfq(rfqId), values, 'draft')),

  submitQuotation: (rfqId, values) =>
    write(() => {
      const rfq = invitedRfq(rfqId);
      if (rfq.lifecycle !== 'open' || isPastDeadline(rfq, clock.now())) throw new ApiError('errors.rfqClosed', 'RFQ is closed', 409);
      if (values.validityDays < rfq.terms.minValidityDays) throw new ApiError('errors.validityTooShort', 'Quotation validity is below the RFQ minimum', 422);
      return upsertQuote(rfq, values, 'submitted');
    }),

  withdrawQuotation: (quotationId) =>
    write(() => {
      const q = db.quotations.find((x) => x.id === quotationId && x.supplierId === mySupplierId());
      if (!q) throw new ApiError('errors.notFound', 'Quotation not found', 404);
      const rfq = findRfq(q.rfqId);
      if (!canWithdrawQuotation(q, rfq, clock.now())) throw new ApiError('errors.quoteLocked', 'Quotation can no longer be withdrawn', 409);
      q.status = 'withdrawn';
      q.updatedAt = clock.nowIso();
      return q;
    }),

  declineRfq: (rfqId) =>
    write(() => {
      const rfq = invitedRfq(rfqId);
      const inv = rfq.invitations.find((i) => i.supplierId === mySupplierId())!;
      inv.declinedAt = clock.nowIso();
    }),

  quotations: ({ tab, page, pageSize }) =>
    read(() => {
      const sid = mySupplierId();
      const now = clock.now();
      const mine = db.quotations
        .filter((q) => q.supplierId === sid && q.status !== 'draft')
        .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
      const items = mine.map((quotation) => {
        const rfq = findRfq(quotation.rfqId);
        return { quotation, rfq, buyer: buyerOf(rfq), total: quotationTotal(quotation.unitPrice, rfq.quantity, quotation.moq) };
      });
      const counts = Object.fromEntries(QUOTATION_TABS.map((t) => [t, t === 'all' ? items.length : items.filter((i) => quotationTab(i.quotation) === t).length])) as Record<QuotationTab, number>;
      const inTab = tab === 'all' ? items : items.filter((i) => quotationTab(i.quotation) === tab);
      return {
        ...paginate(inTab, page, pageSize),
        counts,
        stats: {
          submitted: items.filter((i) => i.quotation.status !== 'withdrawn').length,
          pending: counts.pending,
          awarded: counts.awarded,
          notSelected: counts.not_selected,
          submittedLast30Days: items.filter((i) => i.quotation.submittedAt && daysBetween(i.quotation.submittedAt, now) <= 30).length,
        },
      };
    }),

  quotation: (id) =>
    read(() => {
      const q = db.quotations.find((x) => x.id === id && x.supplierId === mySupplierId());
      if (!q) throw new ApiError('errors.notFound', 'Quotation not found', 404);
      const rfq = findRfq(q.rfqId);
      return { ...view(rfq), quotation: q };
    }),

  performance: () =>
    read(() => {
      const sid = mySupplierId();
      const months = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10'];
      const perf = supplierPerformance(sid, db.rfqs, db.quotations, months);
      const recent = db.quotations
        .filter((q) => q.supplierId === sid && q.submittedAt && q.status !== 'withdrawn' && q.status !== 'draft')
        .sort((a, b) => b.submittedAt!.localeCompare(a.submittedAt!))
        .slice(0, 4)
        .map((quotation) => {
          const rfq = findRfq(quotation.rfqId);
          return { rfq, buyer: buyerOf(rfq), quotation, priceRank: anonymousPriceRank(quotation, quotesForRfq(rfq.id, db.quotations)) };
        });
      return { ...perf, recent };
    }),

  profile: () => read(() => findSupplier(mySupplierId())),

  updateProfile: (patch) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      Object.assign(s, patch);
      return s;
    }),

  products: () => read(() => db.products.filter((p) => p.supplierId === mySupplierId())),

  saveProduct: (input) =>
    write(() => {
      const sid = mySupplierId();
      if (input.id) {
        const p = db.products.find((x) => x.id === input.id && x.supplierId === sid);
        if (!p) throw new ApiError('errors.notFound', 'Product not found', 404);
        Object.assign(p, input);
        return p;
      }
      if (db.products.some((p) => p.supplierId === sid && p.sku.toLowerCase() === input.sku.toLowerCase())) {
        throw new ApiError('errors.duplicateSku', 'SKU already exists', 409);
      }
      const p = { ...input, id: nextId('prod'), supplierId: sid };
      db.products.push(p);
      return p;
    }),

  deleteProduct: (id) =>
    write(() => {
      db.products = db.products.filter((p) => !(p.id === id && p.supplierId === mySupplierId()));
    }),

  saveProductionLine: (input) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      if (input.id) {
        const line = s.productionLines.find((l) => l.id === input.id);
        if (!line) throw new ApiError('errors.notFound', 'Line not found', 404);
        Object.assign(line, input);
        return line;
      }
      const line = { ...input, id: nextId('line') };
      s.productionLines.push(line);
      s.capability.lineCount = s.productionLines.length;
      return line;
    }),

  deleteProductionLine: (id) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      s.productionLines = s.productionLines.filter((l) => l.id !== id);
      s.capability.lineCount = s.productionLines.length;
    }),

  addCertificate: (input) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      const cert = {
        id: nextId('cert'),
        code: input.name.split(' ')[0] === 'ISO' ? input.name.split(' ').slice(0, 2).join(' ') : input.name.split(' ')[0],
        name: input.name,
        description: input.name,
        issuer: input.issuer,
        number: input.number,
        validFrom: clock.nowIso(),
        validTo: new Date(input.validTo).toISOString(),
        status: 'pending' as const,
        submittedAt: clock.nowIso(),
      };
      s.certificates.push(cert);
      return cert;
    }),

  saveContact: (input) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      const initials = input.name
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
      if (input.isPrimary) s.contacts.forEach((c) => (c.isPrimary = false));
      if (input.id) {
        const c = s.contacts.find((x) => x.id === input.id);
        if (!c) throw new ApiError('errors.notFound', 'Contact not found', 404);
        Object.assign(c, input, { initials });
        return c;
      }
      const c = { ...input, id: nextId('contact'), initials };
      s.contacts.push(c);
      return c;
    }),

  deleteContact: (id) =>
    write(() => {
      const s = findSupplier(mySupplierId());
      const c = s.contacts.find((x) => x.id === id);
      if (c?.isPrimary) throw new ApiError('errors.primaryContact', 'Cannot delete the primary contact', 409);
      s.contacts = s.contacts.filter((x) => x.id !== id);
    }),
};
