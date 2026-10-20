import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeSearch } from './helpSearch';

describe('help search', () => {
  it('normalises diacritics, đ and whitespace', () => {
    expect(normalizeSearch('  Báo   giá KÍN ')).toBe('bao gia kin');
    expect(normalizeSearch('Đấu thầu')).toBe('dau thau');
  });

  it('matches when every word appears, with or without accents', () => {
    expect(matchesQuery('bao gia kin', 'Cơ chế Báo giá kín', 'hoạt động thế nào?')).toBe(true);
    expect(matchesQuery('Báo giá MOQ', 'Báo giá', 'sản lượng tối thiểu (MOQ)')).toBe(true);
    expect(matchesQuery('báo giá excel', 'Báo giá kín')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesQuery('   ', 'anything')).toBe(true);
  });
});
