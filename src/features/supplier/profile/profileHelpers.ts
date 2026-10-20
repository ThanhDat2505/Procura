import { daysBetween } from '@/domain/clock';
import type { Certificate, ProductionLine, Supplier, SupplierContact } from '@/domain/types';

/** Recommended number of factory photos for a complete profile. */
export const MIN_FACTORY_PHOTOS = 4;
/** A certificate is "expiring soon" within this many days of its end date. */
export const EXPIRING_SOON_DAYS = 90;

export type CertificateValidity = { state: 'valid' | 'expiring' | 'expired'; daysLeft: number };

export function certificateValidity(validTo: string, now: Date): CertificateValidity {
  const daysLeft = daysBetween(now, validTo);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { state: 'expiring', daysLeft };
  return { state: 'valid', daysLeft };
}

export type CompletenessHint =
  | { kind: 'photos'; missing: number }
  | { kind: 'pendingCertificate'; name: string }
  | { kind: 'expiringCertificate'; name: string; daysLeft: number }
  | { kind: 'contacts' }
  | { kind: 'website' }
  | { kind: 'description' }
  | { kind: 'complete' };

/** Picks the single most useful "Bổ sung thêm …" hint from what the profile is missing. */
export function completenessHint(supplier: Pick<Supplier, 'photos' | 'certificates' | 'contacts' | 'website' | 'description'>, now: Date): CompletenessHint {
  if (supplier.photos.length < MIN_FACTORY_PHOTOS) return { kind: 'photos', missing: MIN_FACTORY_PHOTOS - supplier.photos.length };
  const pending = supplier.certificates.find((c) => c.status === 'pending');
  if (pending) return { kind: 'pendingCertificate', name: pending.name };
  const expiring = supplier.certificates
    .filter((c) => c.status === 'verified')
    .map((c) => ({ c, v: certificateValidity(c.validTo, now) }))
    .filter(({ v }) => v.state !== 'valid')
    .sort((a, b) => a.v.daysLeft - b.v.daysLeft)[0];
  if (expiring) return { kind: 'expiringCertificate', name: expiring.c.name, daysLeft: Math.max(0, expiring.v.daysLeft) };
  if (supplier.contacts.length < 2) return { kind: 'contacts' };
  if (!supplier.website?.trim()) return { kind: 'website' };
  if (supplier.description.trim().length < 120) return { kind: 'description' };
  return { kind: 'complete' };
}

/** i18n key for the completeness level label. */
export function completenessLevel(value: number): 'excellent' | 'good' | 'fair' | 'low' {
  if (value >= 0.95) return 'excellent';
  if (value >= 0.75) return 'good';
  if (value >= 0.5) return 'fair';
  return 'low';
}

/** "Sóng B, Sóng C\nSóng E" → ["Sóng B", "Sóng C", "Sóng E"] (trimmed, de-duplicated). */
export function parseList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n;]/)) {
    const item = raw.trim();
    const key = item.toLowerCase();
    if (item && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function lineKindCounts(lines: ProductionLine[]): { corrugating: number; printing: number } {
  return {
    corrugating: lines.filter((l) => l.kind === 'corrugating').length,
    printing: lines.filter((l) => l.kind === 'printing').length,
  };
}

export function primaryContact(contacts: SupplierContact[]): SupplierContact | undefined {
  return contacts.find((c) => c.isPrimary) ?? contacts[0];
}

/** Strips server-owned fields so a contact can be sent back to `saveContact`. */
export function toContactInput(c: SupplierContact): Omit<SupplierContact, 'id' | 'initials'> & { id: string } {
  const { initials: _initials, ...rest } = c;
  return rest;
}

export function verifiedCertificates(certs: Certificate[]): Certificate[] {
  return certs.filter((c) => c.status === 'verified');
}

/** "10/2024" (vi) / "10/2024" (en) month-year stamp. */
export function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
