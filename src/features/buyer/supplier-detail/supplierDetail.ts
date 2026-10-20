import { daysBetween } from '@/domain/clock';
import type { Certificate, Product, SupplierContact } from '@/domain/types';
import type { SupplierHistoryRow } from '@/services';

/** Pure view helpers for the buyer's supplier detail pages (BUY-03 … BUY-03e). */

/** Lower-case, accent-insensitive form used for client-side search ("Hộp" matches "hop"). */
export function foldText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/** Product search over name, spec and SKU. An empty query matches everything. */
export function matchesProduct(product: Pick<Product, 'name' | 'spec' | 'sku'>, query: string): boolean {
  const q = foldText(query.trim());
  if (!q) return true;
  return foldText(`${product.name} ${product.spec} ${product.sku}`).includes(q);
}

/** Product groups in catalogue order with their item counts. */
export function productGroups(products: Pick<Product, 'group'>[]): { group: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
  return [...counts].map(([group, count]) => ({ group, count }));
}

/** "0918.425.888" → "0918.xxx.xxx": keeps the first 4 digits and the separators. */
export function maskPhone(phone: string): string {
  let digits = 0;
  return phone.replace(/\d/g, (d) => (++digits <= 4 ? d : 'x'));
}

/** `tel:` URI for a formatted phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** The contact buyers should reach: the primary one, otherwise the first visible contact. */
export function primaryContact(contacts: SupplierContact[]): SupplierContact | undefined {
  return contacts.find((c) => c.isPrimary) ?? contacts.find((c) => c.visibleToBuyers) ?? contacts[0];
}

export const EXPIRING_SOON_DAYS = 90;

export type CertificateValidity = { state: 'valid' } | { state: 'expiring'; daysLeft: number } | { state: 'expired' };

/** "Còn hiệu lực" / "Sắp hết hạn: Còn N ngày" (≤ 90 days) / expired, relative to `now`. */
export function certificateValidity(cert: Pick<Certificate, 'validTo'>, now: Date): CertificateValidity {
  const daysLeft = daysBetween(now, cert.validTo);
  if (daysLeft < 0) return { state: 'expired' };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { state: 'expiring', daysLeft };
  return { state: 'valid' };
}

/** Short code shown in the square certificate tile ("ISO", "FSC", "EMS" for ISO 14001). */
export function certificateTileLabel(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith('ISO 14001')) return 'EMS';
  if (c.startsWith('ISO 45001')) return 'OHS';
  return c.split(/[\s:-]/)[0].slice(0, 4);
}

/** "10/2024" — month/year used for audit and verification stamps. */
export function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Ratio in 0..1, 0 when the denominator is empty. */
export function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

/** Most recent RFQ in which the supplier actually quoted. */
export function latestQuotedRow(rows: SupplierHistoryRow[]): SupplierHistoryRow | undefined {
  return rows.filter((r) => r.outcome !== 'no_response').reduce<SupplierHistoryRow | undefined>((best, r) => (!best || r.invitedAt > best.invitedAt ? r : best), undefined);
}
