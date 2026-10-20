import { EMPTY_SUPPLIER_FILTERS } from '@/domain/supplierSearch';
import { escapeCsvCell, toCsv } from './csv';
import { activeFilterCount, clearPanelFilters, parseDiscoveryParams, toDiscoveryParams, toggleValue, type DiscoveryState } from './discoveryParams';

describe('csv', () => {
  it('quotes cells containing separators, quotes and newlines', () => {
    expect(escapeCsvCell('Bao Bì Tân Phát')).toBe('Bao Bì Tân Phát');
    expect(escapeCsvCell('ISO 9001, FSC')).toBe('"ISO 9001, FSC"');
    expect(escapeCsvCell('Hộp "cứng"')).toBe('"Hộp ""cứng"""');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('renders empty cells and numbers', () => {
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(4.9)).toBe('4.9');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('joins header and rows with CRLF', () => {
    expect(toCsv(['Tên', 'MOQ'], [['Tân Phát', '3.000 cái'], ['Tiến Đạt', 10000]])).toBe('Tên,MOQ\r\nTân Phát,3.000 cái\r\nTiến Đạt,10000');
  });
});

describe('discovery params', () => {
  const state: DiscoveryState = {
    filters: {
      ...EMPTY_SUPPLIER_FILTERS,
      query: 'bao bì carton',
      categories: ['packaging', 'office-supplies'],
      provinces: ['hcm', 'binh-duong'],
      moqBand: '1000to5000',
      certifications: ['ISO 9001', 'FSC'],
      ownFactoryOnly: true,
      exportStandardOnly: false,
    },
    sort: 'rating',
    page: 3,
    view: 'list',
  };

  it('round-trips through URLSearchParams', () => {
    const params = new URLSearchParams(toDiscoveryParams(state).toString());
    expect(parseDiscoveryParams(params)).toEqual(state);
  });

  it('omits defaults and parses an empty URL to defaults', () => {
    const empty: DiscoveryState = { filters: EMPTY_SUPPLIER_FILTERS, sort: 'relevance', page: 1, view: 'grid' };
    expect(toDiscoveryParams(empty).toString()).toBe('');
    expect(parseDiscoveryParams(new URLSearchParams())).toEqual(empty);
  });

  it('ignores unknown or malformed values', () => {
    const parsed = parseDiscoveryParams(new URLSearchParams('cat=packaging,space&prov=paris&moq=huge&sort=price&page=-2&view=table&cert=ISO 9001,XYZ'));
    expect(parsed.filters.categories).toEqual(['packaging']);
    expect(parsed.filters.provinces).toEqual([]);
    expect(parsed.filters.moqBand).toBe('any');
    expect(parsed.filters.certifications).toEqual(['ISO 9001']);
    expect(parsed.sort).toBe('relevance');
    expect(parsed.page).toBe(1);
    expect(parsed.view).toBe('grid');
  });

  it('counts applied panel filters without the query', () => {
    expect(activeFilterCount(state.filters)).toBe(2 + 2 + 1 + 2 + 1);
    expect(activeFilterCount(clearPanelFilters(state.filters))).toBe(0);
    expect(clearPanelFilters(state.filters).query).toBe('bao bì carton');
  });

  it('toggles values in a list', () => {
    expect(toggleValue(['a', 'b'], 'b')).toEqual(['a']);
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });
});
