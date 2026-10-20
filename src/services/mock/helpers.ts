import { clock } from '@/domain/clock';
import { quotesForRfq, rfqDisplayStatus } from '@/domain/rfq';
import type { AppNotification, NotificationKind, Rfq, Role, Supplier, SupplierSummary, User } from '@/domain/types';
import { ApiError, type RfqListItem } from '../contracts';
import { db, nextId } from './db';

export function currentUser(role?: Role): User {
  const user = db.session?.user;
  if (!user) throw new ApiError('errors.unauthorized', 'Not signed in', 401);
  if (role && user.role !== role) throw new ApiError('errors.forbidden', 'Wrong role', 403);
  return user;
}

export function findRfq(id: string): Rfq {
  const rfq = db.rfqs.find((r) => r.id === id);
  if (!rfq) throw new ApiError('errors.notFound', `RFQ ${id} not found`, 404);
  return rfq;
}

/** Buyer can only touch RFQs of their own company. */
export function findOwnRfq(id: string): Rfq {
  const user = currentUser('buyer');
  const rfq = findRfq(id);
  if (rfq.buyerCompanyId !== user.organizationId) throw new ApiError('errors.notFound', `RFQ ${id} not found`, 404);
  return rfq;
}

export function findSupplier(id: string): Supplier {
  const s = db.suppliers.find((x) => x.id === id);
  if (!s) throw new ApiError('errors.notFound', `Supplier ${id} not found`, 404);
  return s;
}

export function toSummary(s: Supplier): SupplierSummary {
  return {
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    initials: s.initials,
    province: s.province,
    locationLabel: s.locationLabel,
    verified: s.verified,
    rating: s.rating,
    reviewCount: s.reviewCount,
    categories: s.categories,
    highlightProducts: s.highlightProducts,
    tagline: s.tagline,
    moq: s.moq,
    moqUnit: s.moqUnit,
    leadTimeMinDays: s.leadTimeMinDays,
    leadTimeMaxDays: s.leadTimeMaxDays,
    certifications: s.certifications,
    hasOwnFactory: s.hasOwnFactory,
    exportStandard: s.exportStandard,
    completedRfqCount: s.completedRfqCount,
  };
}

export function findUser(id: string): User {
  return (
    db.users.find((u) => u.id === id) ?? {
      id,
      name: id,
      initials: '?',
      title: '',
      email: '',
      role: 'buyer',
      organizationId: '',
    }
  );
}

export function listItem(rfq: Rfq): RfqListItem {
  const quotes = quotesForRfq(rfq.id, db.quotations);
  const owner = findUser(rfq.ownerId);
  return {
    rfq,
    status: rfqDisplayStatus(rfq, quotes.length, clock.now()),
    quoteCount: quotes.length,
    invitedCount: rfq.invitations.length,
    owner: { id: owner.id, name: owner.name, initials: owner.initials },
    lowestUnitPrice: quotes.length ? Math.min(...quotes.map((q) => q.unitPrice)) : undefined,
  };
}

export function notify(userId: string, kind: NotificationKind, title: string, body: string, link?: string): void {
  const n: AppNotification = { id: nextId('n'), userId, kind, title, body, at: clock.nowIso(), read: false, link };
  db.notifications.unshift(n);
}

/** Primary buyer contact (RFQ owner) used for supplier-facing views. */
export function buyerOwner(rfq: Rfq): User {
  return findUser(rfq.ownerId);
}

/** Deterministic pseudo-random in [0,1) from a string – keeps simulated data stable across reloads. */
export function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
