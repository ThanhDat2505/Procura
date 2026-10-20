import { clock, hoursBetween } from '@/domain/clock';
import { quotesForRfq } from '@/domain/rfq';
import { filterSuppliers, sortSuppliers } from '@/domain/supplierSearch';
import type { CategoryId, Province } from '@/domain/types';
import type { HistoryOutcome, SavedSupplierApi, SupplierApi, SupplierHistoryRow } from '../contracts';
import { ApiError } from '../contracts';
import { read, write } from './accountApi';
import { db, nextId } from './db';
import { currentUser, findSupplier, paginate, toSummary } from './helpers';

export const supplierApi: SupplierApi = {
  search: ({ filters, sort, page, pageSize }) =>
    read(() => {
      const all = db.suppliers.map(toSummary);
      const matched = sortSuppliers(filterSuppliers(all, filters), sort);
      // Facet counts ignore their own dimension so users can widen a selection.
      const catCounts = new Map<CategoryId, number>();
      for (const s of filterSuppliers(all, { ...filters, categories: [] })) s.categories.forEach((c) => catCounts.set(c, (catCounts.get(c) ?? 0) + 1));
      const provCounts = new Map<Province, number>();
      for (const s of filterSuppliers(all, { ...filters, provinces: [] })) provCounts.set(s.province, (provCounts.get(s.province) ?? 0) + 1);
      return {
        ...paginate(matched, page, pageSize),
        facets: {
          categories: [...catCounts].map(([key, count]) => ({ key, count })),
          provinces: [...provCounts].map(([key, count]) => ({ key, count })),
        },
      };
    }),

  get: (id) => read(() => findSupplier(id)),

  products: (id) => read(() => db.products.filter((p) => p.supplierId === id && p.visibleToBuyers)),

  reviews: (id, query) =>
    read(() => {
      const user = currentUser('buyer');
      const supplier = findSupplier(id);
      const summary = db.reviewSummaries.find((s) => s.supplierId === id) ?? {
        supplierId: id,
        average: supplier.rating,
        total: supplier.reviewCount,
        distribution: [Math.round(supplier.reviewCount * 0.7), Math.round(supplier.reviewCount * 0.25), Math.round(supplier.reviewCount * 0.05), 0, 0] as [number, number, number, number, number],
        criteria: { quality: supplier.rating, onTime: supplier.rating - 0.1, price: supplier.rating - 0.3, support: supplier.rating },
      };
      let list = db.reviews.filter((r) => r.supplierId === id);
      if (query.rating) list = list.filter((r) => Math.round(r.rating) === query.rating);
      if (query.withText) list = list.filter((r) => r.text.length > 80);
      if (query.sameCategory) list = list.filter((r) => /carton|hộp|thùng/i.test(r.rfqTitle));
      list = [...list].sort((a, b) =>
        query.sort === 'highest' ? b.rating - a.rating : query.sort === 'lowest' ? a.rating - b.rating : b.date.localeCompare(a.date),
      );
      const reviewed = new Set(db.reviews.filter((r) => r.supplierId === id).map((r) => r.rfqCode));
      const pendingReviewRfqs = db.rfqs
        .filter((r) => r.buyerCompanyId === user.organizationId && r.lifecycle === 'awarded' && !reviewed.has(r.code))
        .filter((r) => db.quotations.find((q) => q.id === r.awardedQuotationId)?.supplierId === id)
        .map((r) => ({ rfqId: r.id, code: r.code, title: r.title }));
      return { summary, page: paginate(list, query.page, query.pageSize), pendingReviewRfqs };
    }),

  history: (id) =>
    read(() => {
      const user = currentUser('buyer');
      const rfqs = db.rfqs
        .filter((r) => r.buyerCompanyId === user.organizationId && r.lifecycle !== 'draft' && r.invitations.some((i) => i.supplierId === id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const responseHours: number[] = [];
      const rows: SupplierHistoryRow[] = rfqs.map((rfq) => {
        const quote = quotesForRfq(rfq.id, db.quotations).find((q) => q.supplierId === id);
        const inv = rfq.invitations.find((i) => i.supplierId === id)!;
        if (quote?.submittedAt) responseHours.push(hoursBetween(inv.sentAt, quote.submittedAt));
        let outcome: HistoryOutcome = 'no_response';
        if (quote) outcome = quote.status === 'awarded' ? 'awarded' : quote.status === 'not_selected' ? 'not_selected' : 'pending';
        return {
          rfqId: rfq.id,
          code: rfq.code,
          title: rfq.title,
          invitedAt: inv.sentAt,
          unitPrice: quote?.unitPrice,
          unit: rfq.unit,
          moq: quote?.moq,
          leadTimeDays: quote?.leadTimeDays,
          outcome,
          note: quote?.buyerFeedback,
        };
      });
      const rating = db.internalRatings.find((r) => r.supplierId === id && r.buyerCompanyId === user.organizationId) ?? null;
      return {
        stats: {
          invited: rows.length,
          quoted: rows.filter((r) => r.outcome !== 'no_response').length,
          awarded: rows.filter((r) => r.outcome === 'awarded').length,
          avgResponseHours: responseHours.length ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : 0,
        },
        rows,
        internalRating: rating,
      };
    }),
};

export const savedSupplierApi: SavedSupplierApi = {
  list: () =>
    read(() => {
      const user = currentUser('buyer');
      const items = db.savedSuppliers.map((s) => {
        const supplier = findSupplier(s.supplierId);
        const lastQuote = db.quotations
          .filter((q) => q.supplierId === s.supplierId && q.submittedAt)
          .filter((q) => db.rfqs.find((r) => r.id === q.rfqId)?.buyerCompanyId === user.organizationId)
          .sort((a, b) => b.submittedAt!.localeCompare(a.submittedAt!))[0];
        const rfq = lastQuote && db.rfqs.find((r) => r.id === lastQuote.rfqId);
        return {
          ...s,
          supplier: toSummary(supplier),
          lastInteraction: lastQuote && rfq ? { label: `Báo giá ${rfq.code}`, at: lastQuote.submittedAt! } : undefined,
        };
      });
      const lists = db.savedLists.map((l) => ({ ...l, count: db.savedSuppliers.filter((s) => s.listIds.includes(l.id)).length }));
      return { lists, items };
    }),
  save: (supplierId, listId) =>
    write(() => {
      currentUser('buyer');
      findSupplier(supplierId);
      if (db.savedSuppliers.some((s) => s.supplierId === supplierId)) return;
      const supplier = findSupplier(supplierId);
      const fallbackList = db.savedLists.find((l) => (supplier.categories[0] === 'packaging' ? l.id === 'list-packaging' : false));
      db.savedSuppliers.unshift({
        supplierId,
        listIds: listId ? [listId] : fallbackList ? [fallbackList.id] : [],
        note: '',
        savedAt: clock.nowIso(),
      });
    }),
  unsave: (supplierId) =>
    write(() => {
      currentUser('buyer');
      db.savedSuppliers = db.savedSuppliers.filter((s) => s.supplierId !== supplierId);
    }),
  createList: (name) =>
    write(() => {
      currentUser('buyer');
      if (!name.trim()) throw new ApiError('validation.required');
      const list = { id: nextId('list'), name: name.trim() };
      db.savedLists.push(list);
      return list;
    }),
  updateNote: (supplierId, note) =>
    write(() => {
      const item = db.savedSuppliers.find((s) => s.supplierId === supplierId);
      if (item) item.note = note;
    }),
};
