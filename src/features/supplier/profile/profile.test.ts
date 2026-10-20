import { describe, expect, it } from 'vitest';
import type { Certificate, FactoryPhoto, SupplierContact } from '@/domain/types';
import { certificateValidity, completenessHint, completenessLevel, parseList, toContactInput } from './profileHelpers';
import { certificateSchema, matchesCertification, productSchema } from './profileSchemas';

const now = new Date('2025-11-18T09:30:00+07:00');
const photo = (id: string): FactoryPhoto => ({ id, imageKey: 'warehouse', caption: id, subcaption: '', audited: true });
const cert = (over: Partial<Certificate>): Certificate => ({
  id: 'c',
  code: 'ISO 9001',
  name: 'ISO 9001:2015',
  description: '',
  issuer: 'TÜV',
  number: 'X',
  validFrom: '2024-01-01T00:00:00.000Z',
  validTo: '2027-01-01T00:00:00.000Z',
  status: 'verified',
  ...over,
});
const contact = (id: string): SupplierContact => ({
  id,
  name: 'A B',
  initials: 'AB',
  title: '',
  email: 'a@b.vn',
  phone: '0900000000',
  responsibility: '',
  notifyNewRfq: true,
  isPrimary: id === 'c1',
  visibleToBuyers: true,
});
const base = {
  photos: [photo('1'), photo('2'), photo('3'), photo('4')],
  certificates: [cert({})],
  contacts: [contact('c1'), contact('c2')],
  website: 'x.vn' as string | undefined,
  description: 'x'.repeat(200),
};

describe('certificateValidity', () => {
  it('flags certificates expiring within 90 days', () => {
    expect(certificateValidity('2025-12-18T17:00:00.000Z', now).state).toBe('expiring');
    expect(certificateValidity('2027-01-08T17:00:00.000Z', now).state).toBe('valid');
    expect(certificateValidity('2025-11-01T00:00:00.000Z', now).state).toBe('expired');
  });
});

describe('completenessHint', () => {
  it('asks for photos first when fewer than 4', () => {
    expect(completenessHint({ ...base, photos: [photo('1')] }, now)).toEqual({ kind: 'photos', missing: 3 });
  });
  it('then points to a pending certificate', () => {
    const certificates = [cert({}), cert({ id: 'p', name: 'RoHS Compliance', status: 'pending' })];
    expect(completenessHint({ ...base, certificates }, now)).toEqual({ kind: 'pendingCertificate', name: 'RoHS Compliance' });
  });
  it('then an expiring certificate, then contacts, website and description', () => {
    expect(completenessHint({ ...base, certificates: [cert({ name: 'FSC CoC', validTo: '2025-12-18T17:00:00.000Z' })] }, now)).toMatchObject({
      kind: 'expiringCertificate',
      name: 'FSC CoC',
    });
    expect(completenessHint({ ...base, contacts: [contact('c1')] }, now).kind).toBe('contacts');
    expect(completenessHint({ ...base, website: undefined }, now).kind).toBe('website');
    expect(completenessHint({ ...base, description: 'short' }, now).kind).toBe('description');
    expect(completenessHint(base, now).kind).toBe('complete');
  });
});

describe('profile helpers', () => {
  it('levels completeness', () => {
    expect(completenessLevel(0.85)).toBe('good');
    expect(completenessLevel(1)).toBe('excellent');
    expect(completenessLevel(0.4)).toBe('low');
  });
  it('parses comma / newline separated lists without duplicates', () => {
    expect(parseList('Sóng B, Sóng C\nsóng b,, Sóng E ')).toEqual(['Sóng B', 'Sóng C', 'Sóng E']);
  });
  it('strips server fields from contacts', () => {
    expect(toContactInput(contact('c1'))).not.toHaveProperty('initials');
  });
});

describe('profile schemas', () => {
  const product = {
    name: 'Hộp',
    sku: 'PKG-1',
    group: 'Hộp carton',
    spec: '20x20',
    moq: 1000,
    unit: 'cái',
    priceMin: 9000,
    priceMax: 8000,
    leadTimeMinDays: 5,
    leadTimeMaxDays: 7,
    certifications: [],
    visibleToBuyers: true,
  };
  it('requires min price ≤ max price', () => {
    const r = productSchema.safeParse(product);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['priceMax'], message: 'profile:validation.priceRange' });
    expect(productSchema.safeParse({ ...product, priceMax: 9500 }).success).toBe(true);
  });
  it('rejects empty numbers (NaN from empty inputs)', () => {
    expect(productSchema.safeParse({ ...product, moq: Number.NaN, priceMax: 9500 }).success).toBe(false);
  });
  it('requires a future certificate expiry and a file', () => {
    const schema = certificateSchema(now);
    const ok = { fileName: 'a.pdf', name: 'HACCP', issuer: 'SGS', number: '1', validTo: '2026-05-01' };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, validTo: '2025-11-18' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, fileName: '' }).success).toBe(false);
  });
  it('matches stored certifications to checkbox options', () => {
    expect(matchesCertification('FSC CoC', 'FSC')).toBe(true);
    expect(matchesCertification('ISO 9001', 'ISO 9001')).toBe(true);
    expect(matchesCertification('RoHS', 'FDA')).toBe(false);
  });
});
