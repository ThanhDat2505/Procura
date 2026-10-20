import type { CategoryId, Province, SupplierSummary } from './types';

/** BUY-02 discovery filters. Kept framework-free so the future API can implement the same contract. */
export type MoqBand = 'any' | 'lt1000' | '1000to5000' | 'gt5000';
export type SupplierSort = 'relevance' | 'rating' | 'leadTime' | 'moq';

export interface SupplierFilters {
  query: string;
  categories: CategoryId[];
  provinces: Province[];
  moqBand: MoqBand;
  certifications: string[];
  ownFactoryOnly: boolean;
  exportStandardOnly: boolean;
  minRating: number;
}

export const EMPTY_SUPPLIER_FILTERS: SupplierFilters = {
  query: '',
  categories: [],
  provinces: [],
  moqBand: 'any',
  certifications: [],
  ownFactoryOnly: false,
  exportStandardOnly: false,
  minRating: 0,
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export function matchesMoqBand(moq: number, band: MoqBand): boolean {
  switch (band) {
    case 'lt1000':
      return moq < 1000;
    case '1000to5000':
      return moq >= 1000 && moq <= 5000;
    case 'gt5000':
      return moq > 5000;
    default:
      return true;
  }
}

/** Accent-insensitive text match over name, products and tagline ("bao bi" finds "Bao bì"). */
export function matchesQuery(s: SupplierSummary, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize([s.name, s.shortName, s.tagline, s.locationLabel, ...s.highlightProducts].join(' '));
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export function filterSuppliers<T extends SupplierSummary>(suppliers: T[], f: SupplierFilters): T[] {
  return suppliers.filter(
    (s) =>
      matchesQuery(s, f.query) &&
      (f.categories.length === 0 || f.categories.some((c) => s.categories.includes(c))) &&
      (f.provinces.length === 0 || f.provinces.includes(s.province)) &&
      matchesMoqBand(s.moq, f.moqBand) &&
      f.certifications.every((c) => s.certifications.some((sc) => normalize(sc).includes(normalize(c)))) &&
      (!f.ownFactoryOnly || s.hasOwnFactory) &&
      (!f.exportStandardOnly || s.exportStandard) &&
      s.rating >= f.minRating,
  );
}

export function sortSuppliers<T extends SupplierSummary>(suppliers: T[], sort: SupplierSort): T[] {
  const list = [...suppliers];
  switch (sort) {
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'leadTime':
      return list.sort((a, b) => a.leadTimeMinDays - b.leadTimeMinDays);
    case 'moq':
      return list.sort((a, b) => a.moq - b.moq);
    default:
      // Relevance: verified first, then rating weighted by review volume.
      return list.sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating * Math.log(2 + b.reviewCount) - a.rating * Math.log(2 + a.reviewCount));
  }
}

/** "MOQ phù hợp" / "MOQ 10.000 > 5.000" chip in BUY-06b. */
export function moqFit(supplierMoq: number, requestedQuantity: number): { fits: boolean; excess: number } {
  return { fits: supplierMoq <= requestedQuantity, excess: Math.max(0, supplierMoq - requestedQuantity) };
}
