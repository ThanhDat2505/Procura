import { addDays, clock, daysBetween } from '@/domain/clock';
import { canAward, canSend, DEFAULT_WEIGHTS, deadlineInfo, formatDimensions, isActiveQuote, MAX_SUPPLIERS_PER_RFQ, quotesForRfq, splitDimensions } from '@/domain/rfq';
import type { Rfq, RfqDisplayStatus } from '@/domain/types';
import type { BuyerRfqApi, CompareOverviewCard, RfqListItem, RfqStatusTab } from '../contracts';
import { ApiError } from '../contracts';
import { read, write } from './accountApi';
import { db, nextId } from './db';
import { currentUser, findOwnRfq, findSupplier, findUser, listItem, notify, paginate, toSummary } from './helpers';
import { scheduleSupplierReplies } from './simulation';

const TABS: RfqStatusTab[] = ['all', 'draft', 'open', 'awaiting', 'quoted', 'awarded', 'expired', 'cancelled'];

function ownRfqs(): Rfq[] {
  const user = currentUser('buyer');
  return db.rfqs.filter((r) => r.buyerCompanyId === user.organizationId);
}

function supplierUserId(supplierId: string): string | undefined {
  return db.users.find((u) => u.role === 'supplier' && u.organizationId === supplierId)?.id;
}

function markQuotesViewed(rfq: Rfq): void {
  const now = clock.nowIso();
  for (const q of db.quotations) {
    if (q.rfqId === rfq.id && q.status === 'submitted') {
      q.status = 'viewed';
      q.viewedAt = now;
      const uid = supplierUserId(q.supplierId);
      if (uid) notify(uid, 'rfq_viewed', `Người mua đã xem báo giá ${q.code}`, `${rfq.code} · Chờ kết quả`, `/supplier/quotations/${q.id}`);
    }
  }
}

function newDraft(ownerId: string, buyerCompanyId: string): Rfq {
  db.sequence.rfq += 1;
  const now = clock.now();
  const code = `RFQ-2025-${String(db.sequence.rfq).padStart(3, '0')}`;
  const deadline = addDays(now, 5);
  deadline.setHours(17, 0, 0, 0);
  const neededBy = addDays(now, 20);
  neededBy.setHours(17, 0, 0, 0);
  return {
    id: code.toLowerCase(),
    code,
    title: '',
    buyerCompanyId,
    ownerId,
    categoryId: 'packaging',
    subcategory: '',
    productName: '',
    dimensions: '',
    material: '',
    finishing: '',
    quantity: 0,
    unit: 'cái',
    attachments: [],
    deliveryAddress: db.buyerCompanies.find((c) => c.id === buyerCompanyId)?.address ?? '',
    deadline: deadline.toISOString(),
    neededBy: neededBy.toISOString(),
    priority: 'normal',
    terms: {
      vatIncluded: false,
      currency: 'VND',
      paymentTerms: 'Tạm ứng 50%, thanh toán 50% còn lại khi nhận đủ hàng',
      minValidityDays: 30,
      sampleRequired: false,
      sampleQuantity: 0,
      sampleNote: '',
      requiredCertifications: [],
      weights: { ...DEFAULT_WEIGHTS },
      notesToSuppliers: '',
    },
    invitations: [],
    lifecycle: 'draft',
    events: [{ id: nextId('ev'), type: 'created', at: now.toISOString() }],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedStep: 0,
  };
}

function card(rfq: Rfq): CompareOverviewCard {
  const item = listItem(rfq);
  const quotes = quotesForRfq(rfq.id, db.quotations);
  const cheapest = [...quotes].sort((a, b) => a.unitPrice - b.unitPrice)[0];
  const fastest = [...quotes].sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
  const winner = quotes.find((q) => q.id === rfq.awardedQuotationId);
  return {
    item,
    lowestUnitPrice: cheapest && { value: cheapest.unitPrice, supplierName: findSupplier(cheapest.supplierId).shortName },
    fastestLeadTime: fastest && { days: fastest.leadTimeDays, supplierName: findSupplier(fastest.supplierId).shortName },
    awardedSupplierName: winner && findSupplier(winner.supplierId).name,
    awardedUnitPrice: winner?.unitPrice,
    savingsRate: winner && rfq.budgetMax ? 1 - (winner.unitPrice * rfq.quantity) / rfq.budgetMax : undefined,
  };
}

export const rfqApi: BuyerRfqApi = {
  dashboard: () =>
    read(() => {
      const user = currentUser('buyer');
      const now = clock.now();
      const mine = ownRfqs();
      const items = mine.map(listItem);
      const active = items.filter((i) => ['open', 'awaiting', 'quoted'].includes(i.status));
      const myQuotes = db.quotations.filter((q) => mine.some((r) => r.id === q.rfqId) && isActiveQuote(q));
      const toReview = myQuotes.filter((q) => q.status === 'submitted' || (q.status === 'viewed' && mine.find((r) => r.id === q.rfqId)?.lifecycle === 'open'));
      const awarded = mine.filter((r) => r.lifecycle === 'awarded' && r.budgetMax && r.awardedQuotationId);
      let budget = 0;
      let spent = 0;
      for (const r of awarded) {
        const q = db.quotations.find((x) => x.id === r.awardedQuotationId)!;
        budget += r.budgetMax!;
        spent += q.unitPrice * Math.max(r.quantity, q.moq);
      }
      const invitations = mine.filter((r) => r.lifecycle !== 'draft').flatMap((r) => r.invitations.map((i) => ({ r, i })));
      const responded = invitations.filter(({ r, i }) => myQuotes.some((q) => q.rfqId === r.id && q.supplierId === i.supplierId));
      const recentQuotes = [...myQuotes]
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
        .slice(0, 4)
        .map((q) => {
          const rfq = mine.find((r) => r.id === q.rfqId)!;
          return { quotation: q, supplier: toSummary(findSupplier(q.supplierId)), rfqCode: rfq.code, rfqId: rfq.id, unit: rfq.unit };
        });
      const savedIds = new Set(db.savedSuppliers.map((s) => s.supplierId));
      return {
        greetingName: user.name.split(' ').slice(-1)[0],
        stats: {
          activeRfqs: active.length,
          activeRfqsDueSoon: active.filter((i) => ['soon', 'today'].includes(deadlineInfo(i.rfq.deadline, now).urgency)).length,
          quotesToReview: toReview.length,
          quotesNewToday: myQuotes.filter((q) => q.submittedAt && daysBetween(q.submittedAt, now) <= 1).length,
          savingsRate: budget ? (budget - spent) / budget : 0,
          savingsAmount: budget - spent,
          avgResponseRate: invitations.length ? responded.length / invitations.length : 0,
          avgResponseHours: 4.2,
        },
        recentRfqs: active.sort((a, b) => a.rfq.deadline.localeCompare(b.rfq.deadline)).slice(0, 5),
        recentQuotes,
        featuredSuppliers: db.suppliers
          .filter((s) => s.verified && !savedIds.has(s.id))
          .sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount)
          .slice(0, 2)
          .map(toSummary),
      };
    }),

  list: (params) =>
    read(() => {
      const now = clock.now();
      const all = ownRfqs()
        .map(listItem)
        .sort((a, b) => b.rfq.createdAt.localeCompare(a.rfq.createdAt));
      const q = params.query?.trim().toLowerCase();
      const filtered = all.filter(
        (i) =>
          (!q || i.rfq.code.toLowerCase().includes(q) || i.rfq.title.toLowerCase().includes(q) || i.rfq.productName.toLowerCase().includes(q)) &&
          (!params.categoryId || i.rfq.categoryId === params.categoryId) &&
          (!params.ownerId || i.rfq.ownerId === params.ownerId) &&
          (!params.deadlineWithinDays || (daysBetween(now, i.rfq.deadline) >= 0 && daysBetween(now, i.rfq.deadline) <= params.deadlineWithinDays)),
      );
      const counts = Object.fromEntries(TABS.map((t) => [t, t === 'all' ? filtered.length : filtered.filter((i) => i.status === t).length])) as Record<RfqStatusTab, number>;
      const inTab = params.tab === 'all' ? filtered : filtered.filter((i) => i.status === params.tab);
      const thisMonth = now.toISOString().slice(0, 7);
      const owners = [...new Map(all.map((i) => [i.owner.id, { id: i.owner.id, name: i.owner.name }])).values()];
      return {
        ...paginate(inTab, params.page, params.pageSize),
        counts,
        stats: {
          open: all.filter((i) => ['open', 'awaiting'].includes(i.status)).length,
          awaitingDecision: all.filter((i) => i.status === 'quoted').length,
          dueSoon: all.filter((i) => ['open', 'awaiting', 'quoted'].includes(i.status) && ['soon', 'today'].includes(deadlineInfo(i.rfq.deadline, now).urgency)).length,
          awardedThisMonth: all.filter((i) => i.status === 'awarded' && i.rfq.awardedAt?.slice(0, 7) === thisMonth).length,
        },
        owners,
      };
    }),

  get: (id) =>
    read(() => {
      const rfq = findOwnRfq(id);
      const quotes = quotesForRfq(rfq.id, db.quotations);
      return {
        rfq,
        status: listItem(rfq).status,
        owner: findUser(rfq.ownerId),
        invitations: rfq.invitations.map((inv) => ({
          supplier: toSummary(findSupplier(inv.supplierId)),
          sentAt: inv.sentAt,
          viewedAt: inv.viewedAt,
          declinedAt: inv.declinedAt,
          quotation: quotes.find((q) => q.supplierId === inv.supplierId),
        })),
        quotations: quotes.map((q) => ({ ...q, supplier: toSummary(findSupplier(q.supplierId)) })),
      };
    }),

  createDraft: (input) =>
    write(() => {
      const user = currentUser('buyer');
      const rfq = newDraft(user.id, user.organizationId);
      const ids = (input?.supplierIds ?? []).slice(0, MAX_SUPPLIERS_PER_RFQ);
      rfq.invitations = ids.map((supplierId) => ({ supplierId, sentAt: rfq.createdAt }));
      if (input?.productId) {
        const p = db.products.find((x) => x.id === input.productId);
        if (p) {
          rfq.productName = p.name;
          rfq.subcategory = p.group;
          // Product specs mix size and material ("25×18×10 cm, Kraft 140gsm"); keep each in its own field.
          const { dimensions, rest } = splitDimensions(p.spec);
          rfq.dimensions = dimensions ? formatDimensions(dimensions) : '';
          rfq.material = rest;
          rfq.title = `Yêu cầu báo giá ${p.name}`;
          rfq.invitations = [{ supplierId: p.supplierId, sentAt: rfq.createdAt }];
        }
      }
      db.rfqs.push(rfq);
      return rfq;
    }),

  updateDraft: (id, patch) =>
    write(() => {
      const rfq = findOwnRfq(id);
      if (rfq.lifecycle !== 'draft') throw new ApiError('errors.notDraft', 'Only drafts can be edited', 409);
      const { terms, supplierIds, ...rest } = patch;
      Object.assign(rfq, rest);
      if (terms) rfq.terms = { ...rfq.terms, ...terms, weights: { ...rfq.terms.weights, ...terms.weights } };
      if (supplierIds) {
        if (supplierIds.length > MAX_SUPPLIERS_PER_RFQ) throw new ApiError('validation.maxSuppliers');
        rfq.invitations = supplierIds.map((supplierId) => ({ supplierId, sentAt: rfq.createdAt }));
      }
      rfq.updatedAt = clock.nowIso();
      return rfq;
    }),

  send: (id) =>
    write(() => {
      const rfq = findOwnRfq(id);
      const now = clock.now();
      if (!canSend(rfq, now)) throw new ApiError('errors.rfqIncomplete', 'RFQ is not ready to send', 422);
      const iso = now.toISOString();
      rfq.lifecycle = 'open';
      rfq.sentAt = iso;
      rfq.updatedAt = iso;
      rfq.completedStep = 4;
      rfq.invitations = rfq.invitations.map((i) => ({ supplierId: i.supplierId, sentAt: iso }));
      rfq.events.push({ id: nextId('ev'), type: 'sent', at: iso, note: String(rfq.invitations.length) });
      const buyer = db.buyerCompanies.find((c) => c.id === rfq.buyerCompanyId)!;
      for (const inv of rfq.invitations) {
        const uid = supplierUserId(inv.supplierId);
        if (uid) notify(uid, 'rfq_received', `Yêu cầu báo giá mới: ${rfq.code}`, `${buyer.name} · ${rfq.title}`, `/supplier/inbox/${rfq.id}`);
      }
      scheduleSupplierReplies(rfq);
      return rfq;
    }),

  cancel: (id) =>
    write(() => {
      const rfq = findOwnRfq(id);
      if (rfq.lifecycle === 'awarded') throw new ApiError('errors.alreadyAwarded', 'RFQ already awarded', 409);
      rfq.lifecycle = 'cancelled';
      rfq.updatedAt = clock.nowIso();
      rfq.events.push({ id: nextId('ev'), type: 'cancelled', at: rfq.updatedAt });
      db.simulations = db.simulations.filter((s) => s.rfqId !== rfq.id);
      return rfq;
    }),

  duplicate: (id) =>
    write(() => {
      const source = findOwnRfq(id);
      const user = currentUser('buyer');
      const copy = newDraft(user.id, user.organizationId);
      Object.assign(copy, {
        title: source.title,
        categoryId: source.categoryId,
        subcategory: source.subcategory,
        productName: source.productName,
        dimensions: source.dimensions,
        material: source.material,
        finishing: source.finishing,
        quantity: source.quantity,
        unit: source.unit,
        deliveryAddress: source.deliveryAddress,
        budgetMin: source.budgetMin,
        budgetMax: source.budgetMax,
        terms: structuredClone(source.terms),
        invitations: source.invitations.map((i) => ({ supplierId: i.supplierId, sentAt: copy.createdAt })),
        completedStep: 1,
      });
      db.rfqs.push(copy);
      return copy;
    }),

  comparison: (id) =>
    write(() => {
      const rfq = findOwnRfq(id);
      if (rfq.lifecycle === 'open') markQuotesViewed(rfq);
      const quotes = quotesForRfq(rfq.id, db.quotations);
      return { rfq, quotations: quotes, suppliers: quotes.map((q) => findSupplier(q.supplierId)) };
    }),

  award: (id, quotationId) =>
    write(() => {
      const rfq = findOwnRfq(id);
      const quotes = quotesForRfq(rfq.id, db.quotations);
      if (!canAward(rfq, quotes.length)) throw new ApiError('errors.cannotAward', 'RFQ cannot be awarded', 409);
      const winner = quotes.find((q) => q.id === quotationId);
      if (!winner) throw new ApiError('errors.notFound', 'Quotation not found', 404);
      const now = clock.nowIso();
      for (const q of quotes) {
        q.status = q.id === quotationId ? 'awarded' : 'not_selected';
        q.decidedAt = now;
        if (q.id !== quotationId && !q.buyerFeedback) q.buyerFeedback = 'Người mua đã chọn nhà cung cấp khác';
        const uid = supplierUserId(q.supplierId);
        if (uid) {
          notify(
            uid,
            q.id === quotationId ? 'awarded' : 'not_selected',
            q.id === quotationId ? `Báo giá ${q.code} đã trúng thầu` : `Báo giá ${q.code} không được chọn`,
            rfq.code,
            `/supplier/quotations/${q.id}`,
          );
        }
      }
      rfq.lifecycle = 'awarded';
      rfq.awardedQuotationId = quotationId;
      rfq.awardedAt = now;
      rfq.updatedAt = now;
      rfq.events.push({ id: nextId('ev'), type: 'awarded', at: now, supplierId: winner.supplierId });
      db.simulations = db.simulations.filter((s) => s.rfqId !== rfq.id);
      return rfq;
    }),

  rejectQuotation: (rfqId, quotationId, reason) =>
    write(() => {
      const rfq = findOwnRfq(rfqId);
      const q = db.quotations.find((x) => x.id === quotationId && x.rfqId === rfq.id);
      if (!q || !isActiveQuote(q) || q.status === 'awarded') throw new ApiError('errors.notFound', 'Quotation not found', 404);
      q.status = 'not_selected';
      q.decidedAt = clock.nowIso();
      q.buyerFeedback = reason || 'Người mua đã từ chối báo giá';
      const uid = supplierUserId(q.supplierId);
      if (uid) notify(uid, 'not_selected', `Báo giá ${q.code} không được chọn`, rfq.code, `/supplier/quotations/${q.id}`);
    }),

  compareOverview: () =>
    read(() => {
      const mine = ownRfqs().filter((r) => r.createdAt >= '2025-11-01');
      const items: RfqListItem[] = mine.map(listItem);
      const ready = items.filter((i) => i.status === 'quoted').map((i) => card(i.rfq));
      const waiting = items.filter((i) => i.status === 'open' || i.status === 'awaiting').map((i) => card(i.rfq));
      const awarded = items.filter((i) => i.status === 'awarded').map((i) => card(i.rfq));
      const statuses: RfqDisplayStatus[] = ['quoted'];
      return {
        stats: {
          ready: ready.length,
          waiting: waiting.length,
          awarded: awarded.length,
          negotiatedBudget: items.filter((i) => statuses.includes(i.status) || i.status === 'awarded').reduce((s, i) => s + (i.rfq.budgetMax ?? 0), 0),
        },
        ready,
        waiting,
        awarded,
      };
    }),
};
