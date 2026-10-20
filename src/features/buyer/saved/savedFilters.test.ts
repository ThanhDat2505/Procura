import type { SupplierSummary } from '@/domain/types';
import type { SavedSupplierItem } from '@/services';
import { EMPTY_SAVED_FILTERS, filterSavedItems, savedFilterOptions, savedStats } from './savedFilters';

const supplier = (over: Partial<SupplierSummary>): SupplierSummary => ({
  id: 'sup-x',
  name: 'Supplier',
  shortName: 'Supplier',
  initials: 'SU',
  province: 'hcm',
  locationLabel: 'TP.HCM',
  verified: true,
  rating: 4.5,
  reviewCount: 10,
  categories: ['packaging'],
  highlightProducts: [],
  tagline: '',
  moq: 1000,
  moqUnit: 'cái',
  leadTimeMinDays: 5,
  leadTimeMaxDays: 7,
  certifications: [],
  hasOwnFactory: true,
  exportStandard: false,
  completedRfqCount: 0,
  ...over,
});

const item = (s: SupplierSummary, listIds: string[]): SavedSupplierItem => ({ supplierId: s.id, listIds, note: '', savedAt: '2025-11-01T00:00:00.000Z', supplier: s });

const items = [
  item(supplier({ id: 'a', name: 'Bao Bì Tân Phát', certifications: ['ISO 9001', 'FSC'], moq: 3000, leadTimeMinDays: 5, leadTimeMaxDays: 7 }), ['list-packaging']),
  item(supplier({ id: 'b', name: 'Nội Thất Tân Á', province: 'binh-duong', categories: ['furniture'], moq: 20, verified: false, leadTimeMinDays: 10, leadTimeMaxDays: 14 }), ['list-furniture']),
  item(supplier({ id: 'c', name: 'Nhựa Đại Phát', province: 'hai-phong', certifications: ['ISO 14001'], moq: 8000, leadTimeMinDays: 3, leadTimeMaxDays: 3 }), ['list-chemicals']),
];

const ids = (list: SavedSupplierItem[]) => list.map((i) => i.supplierId);

describe('filterSavedItems', () => {
  it('returns everything with empty filters', () => {
    expect(ids(filterSavedItems(items, EMPTY_SAVED_FILTERS))).toEqual(['a', 'b', 'c']);
  });

  it('filters by list, accent-insensitive query, province, certification and MOQ band', () => {
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, listId: 'list-furniture' }))).toEqual(['b']);
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, query: 'tan' }))).toEqual(['a', 'b']);
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, province: 'hai-phong' }))).toEqual(['c']);
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, certification: 'FSC' }))).toEqual(['a']);
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, moqBand: 'lt1000' }))).toEqual(['b']);
    expect(ids(filterSavedItems(items, { ...EMPTY_SAVED_FILTERS, moqBand: 'gt5000', certification: 'FSC' }))).toEqual([]);
  });
});

describe('savedStats', () => {
  it('computes verified count, average lead time and ISO count', () => {
    expect(savedStats(items)).toEqual({ total: 3, verified: 2, avgLeadTimeDays: (6 + 12 + 3) / 3, withIso: 2 });
    expect(savedStats([])).toEqual({ total: 0, verified: 0, avgLeadTimeDays: 0, withIso: 0 });
  });
});

describe('savedFilterOptions', () => {
  it('lists distinct provinces and sorted certifications', () => {
    expect(savedFilterOptions(items)).toEqual({ provinces: ['hcm', 'binh-duong', 'hai-phong'], certifications: ['FSC', 'ISO 14001', 'ISO 9001'] });
  });
});
