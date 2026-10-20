import { CATEGORY_IDS, PROVINCES } from '@/domain/catalog';
import { EMPTY_SUPPLIER_FILTERS, type MoqBand, type SupplierFilters, type SupplierSort } from '@/domain/supplierSearch';
import type { CategoryId, Province } from '@/domain/types';

/** BUY-02 state kept in the URL so searches can be shared and survive back/forward navigation. */
export type DiscoveryView = 'grid' | 'list';

export interface DiscoveryState {
  filters: SupplierFilters;
  sort: SupplierSort;
  page: number;
  view: DiscoveryView;
}

const SORTS: SupplierSort[] = ['relevance', 'rating', 'leadTime', 'moq'];
const MOQ_BANDS: MoqBand[] = ['any', 'lt1000', '1000to5000', 'gt5000'];
/** Certification filters offered in the panel (values match `SupplierSummary.certifications`). */
export const DISCOVERY_CERTIFICATIONS = ['ISO 9001', 'FSC'] as const;

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

export function parseDiscoveryParams(params: URLSearchParams): DiscoveryState {
  const sort = params.get('sort') as SupplierSort | null;
  const moq = params.get('moq') as MoqBand | null;
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    filters: {
      ...EMPTY_SUPPLIER_FILTERS,
      query: params.get('q') ?? '',
      categories: list(params.get('cat')).filter((c): c is CategoryId => (CATEGORY_IDS as string[]).includes(c)),
      provinces: list(params.get('prov')).filter((p): p is Province => (PROVINCES as string[]).includes(p)),
      moqBand: moq && MOQ_BANDS.includes(moq) ? moq : 'any',
      certifications: list(params.get('cert')).filter((c) => (DISCOVERY_CERTIFICATIONS as readonly string[]).includes(c)),
      ownFactoryOnly: params.get('factory') === '1',
      exportStandardOnly: params.get('export') === '1',
    },
    sort: sort && SORTS.includes(sort) ? sort : 'relevance',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: params.get('view') === 'list' ? 'list' : 'grid',
  };
}

/** Inverse of `parseDiscoveryParams`; default values are omitted to keep URLs short. */
export function toDiscoveryParams(state: DiscoveryState): URLSearchParams {
  const p = new URLSearchParams();
  const f = state.filters;
  if (f.query.trim()) p.set('q', f.query.trim());
  if (f.categories.length) p.set('cat', f.categories.join(','));
  if (f.provinces.length) p.set('prov', f.provinces.join(','));
  if (f.moqBand !== 'any') p.set('moq', f.moqBand);
  if (f.certifications.length) p.set('cert', f.certifications.join(','));
  if (f.ownFactoryOnly) p.set('factory', '1');
  if (f.exportStandardOnly) p.set('export', '1');
  if (state.sort !== 'relevance') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  if (state.view !== 'grid') p.set('view', state.view);
  return p;
}

/** "Đang áp dụng: N bộ lọc" — the free-text query is not counted (it lives in the search bar). */
export function activeFilterCount(f: SupplierFilters): number {
  return (
    f.categories.length +
    f.provinces.length +
    (f.moqBand !== 'any' ? 1 : 0) +
    f.certifications.length +
    (f.ownFactoryOnly ? 1 : 0) +
    (f.exportStandardOnly ? 1 : 0)
  );
}

/** Filters with every panel option cleared, keeping the search query. */
export function clearPanelFilters(f: SupplierFilters): SupplierFilters {
  return { ...EMPTY_SUPPLIER_FILTERS, query: f.query };
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
