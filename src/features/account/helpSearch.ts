/** Lower-cases and strips Vietnamese diacritics so "bao gia kin" finds "Báo giá kín". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every word of `query` must appear somewhere in `texts`; an empty query matches everything. */
export function matchesQuery(query: string, ...texts: string[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = normalizeSearch(texts.join(' '));
  return q.split(' ').every((token) => haystack.includes(token));
}
