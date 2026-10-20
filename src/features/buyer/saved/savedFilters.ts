import { matchesMoqBand, matchesQuery, type MoqBand } from '@/domain/supplierSearch';
import type { ID, Province } from '@/domain/types';
import type { SavedSupplierItem } from '@/services';

/** BUY-04 client-side filters over the (small) saved-supplier list. */
export interface SavedFilters {
  query: string;
  listId: ID | 'all';
  province: Province | 'all';
  certification: string | 'all';
  moqBand: MoqBand;
}

export const EMPTY_SAVED_FILTERS: SavedFilters = { query: '', listId: 'all', province: 'all', certification: 'all', moqBand: 'any' };

export function filterSavedItems(items: SavedSupplierItem[], f: SavedFilters): SavedSupplierItem[] {
  return items.filter(
    ({ supplier: s, listIds }) =>
      (f.listId === 'all' || listIds.includes(f.listId)) &&
      matchesQuery(s, f.query) &&
      (f.province === 'all' || s.province === f.province) &&
      (f.certification === 'all' || s.certifications.includes(f.certification)) &&
      matchesMoqBand(s.moq, f.moqBand),
  );
}

/** "Thống kê nhanh" card. */
export function savedStats(items: SavedSupplierItem[]) {
  const total = items.length;
  const verified = items.filter((i) => i.supplier.verified).length;
  const avgLeadTimeDays = total ? items.reduce((sum, i) => sum + (i.supplier.leadTimeMinDays + i.supplier.leadTimeMaxDays) / 2, 0) / total : 0;
  const withIso = items.filter((i) => i.supplier.certifications.some((c) => c.startsWith('ISO'))).length;
  return { total, verified, avgLeadTimeDays, withIso };
}

/** Distinct values present in the list, for the filter selects. */
export function savedFilterOptions(items: SavedSupplierItem[]) {
  const provinces = [...new Set(items.map((i) => i.supplier.province))];
  const certifications = [...new Set(items.flatMap((i) => i.supplier.certifications))].sort();
  return { provinces, certifications };
}
