import { demoElapsedMs, resumeDemoClock } from '@/domain/clock';
import type {
  AppNotification,
  BuyerCompany,
  Product,
  Quotation,
  Rfq,
  SavedSupplier,
  SavedSupplierList,
  Session,
  Supplier,
  SupplierReview,
  User,
} from '@/domain/types';
import type { InternalRating, UserSettings } from '../contracts';
import { internalRatings, notifications, reviewSummaries, reviews, savedLists, savedSuppliers } from './seed/engagement';
import { buyerCompanies, users } from './seed/organizations';
import { quotations, rfqs } from './seed/rfqs';
import { products, suppliers } from './seed/suppliers';

/** A supplier reply the mock backend will "receive" once `dueAt` (real time) has passed. */
export interface PendingSimulation {
  rfqId: string;
  supplierId: string;
  dueAt: number;
}

export interface MockDb {
  version: number;
  users: User[];
  buyerCompanies: BuyerCompany[];
  suppliers: Supplier[];
  products: Product[];
  rfqs: Rfq[];
  quotations: Quotation[];
  reviews: SupplierReview[];
  reviewSummaries: typeof reviewSummaries;
  internalRatings: (InternalRating & { supplierId: string; buyerCompanyId: string })[];
  savedLists: SavedSupplierList[];
  savedSuppliers: SavedSupplier[];
  notifications: AppNotification[];
  settings: Record<string, UserSettings>;
  session: Session | null;
  simulations: PendingSimulation[];
  sequence: { rfq: number; quotation: number; id: number };
}

/** Bump when the seed shape changes so stale browser data is discarded. */
const DB_VERSION = 3;
const STORAGE_KEY = 'procura.mockdb';

const clone = <T>(v: T): T => structuredClone(v);

function seed(): MockDb {
  return {
    version: DB_VERSION,
    users: clone(users),
    buyerCompanies: clone(buyerCompanies),
    suppliers: clone(suppliers),
    products: clone(products),
    rfqs: clone(rfqs),
    quotations: clone(quotations),
    reviews: clone(reviews),
    reviewSummaries: clone(reviewSummaries),
    internalRatings: clone(internalRatings),
    savedLists: clone(savedLists),
    savedSuppliers: clone(savedSuppliers),
    notifications: clone(notifications),
    settings: {},
    session: null,
    simulations: [],
    sequence: { rfq: 97, quotation: 416, id: 1 },
  };
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { db: MockDb; elapsedMs: number };
      if (parsed.db?.version === DB_VERSION) {
        resumeDemoClock(parsed.elapsedMs ?? 0);
        return parsed.db;
      }
    }
  } catch {
    // Storage unavailable or corrupt: fall back to a fresh seed.
  }
  return seed();
}

export let db: MockDb = load();

export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ db, elapsedMs: demoElapsedMs() }));
  } catch {
    // Private mode / quota: the demo keeps working in memory.
  }
}

/** Restore the original demo dataset (also resets the demo clock). Keeps the current session. */
export function resetMockDb(): void {
  const session = db.session;
  db = seed();
  db.session = session;
  resumeDemoClock(0);
  persist();
}

export function nextId(prefix: string): string {
  db.sequence.id += 1;
  return `${prefix}-${Date.now().toString(36)}-${db.sequence.id}`;
}

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 250;

/** Simulated network round-trip; returns a deep copy so callers cannot mutate the store. */
export async function respond<T>(value: T, latency = LATENCY_MS): Promise<T> {
  if (latency > 0) await new Promise((r) => setTimeout(r, latency + Math.random() * 150));
  return clone(value);
}

if (typeof window !== 'undefined') {
  // Handy in demos: `__procura.reset()` in the browser console restores the seed data.
  (window as unknown as { __procura: unknown }).__procura = { reset: () => (resetMockDb(), location.reload()) };
}
