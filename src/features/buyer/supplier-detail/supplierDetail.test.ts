import { describe, expect, it } from 'vitest';
import type { SupplierHistoryRow } from '@/services';
import {
  certificateTileLabel,
  certificateValidity,
  foldText,
  latestQuotedRow,
  maskPhone,
  matchesProduct,
  monthYear,
  productGroups,
  ratio,
  telHref,
} from './supplierDetail';

const now = new Date('2025-11-18T12:00:00Z');

describe('product search', () => {
  const product = { name: 'Hộp carton sóng E 3 lớp in logo', spec: '25×18×10 cm, Kraft Nhật 140gsm', sku: 'PKG-BOX-E01' };

  it('ignores case and Vietnamese accents', () => {
    expect(foldText('Đóng Gói')).toBe('dong goi');
    expect(matchesProduct(product, 'hop carton')).toBe(true);
    expect(matchesProduct(product, 'KRAFT NHAT')).toBe(true);
  });

  it('matches SKU and treats a blank query as match-all', () => {
    expect(matchesProduct(product, 'box-e01')).toBe(true);
    expect(matchesProduct(product, '   ')).toBe(true);
    expect(matchesProduct(product, 'túi giấy')).toBe(false);
  });
});

describe('productGroups', () => {
  it('counts groups in first-seen order', () => {
    expect(productGroups([{ group: 'Hộp carton' }, { group: 'Thùng carton' }, { group: 'Hộp carton' }])).toEqual([
      { group: 'Hộp carton', count: 2 },
      { group: 'Thùng carton', count: 1 },
    ]);
  });
});

describe('phone helpers', () => {
  it('masks everything after the first four digits', () => {
    expect(maskPhone('0918.425.888')).toBe('0918.xxx.xxx');
    expect(telHref('0918.425.888')).toBe('tel:0918425888');
  });
});

describe('certificateValidity', () => {
  it('flags certificates expiring within 90 days', () => {
    expect(certificateValidity({ validTo: '2025-12-18T12:00:00.000Z' }, now)).toEqual({ state: 'expiring', daysLeft: 30 });
    expect(certificateValidity({ validTo: '2026-06-13T17:00:00.000Z' }, now)).toEqual({ state: 'valid' });
    expect(certificateValidity({ validTo: '2025-11-01T00:00:00.000Z' }, now)).toEqual({ state: 'expired' });
  });

  it('derives tile labels', () => {
    expect(certificateTileLabel('ISO 9001')).toBe('ISO');
    expect(certificateTileLabel('ISO 14001')).toBe('EMS');
    expect(certificateTileLabel('FSC')).toBe('FSC');
  });
});

describe('misc', () => {
  it('formats month/year and safe ratios', () => {
    expect(monthYear('2024-10-09T17:00:00.000Z')).toMatch(/^10\/2024$/);
    expect(ratio(5, 6)).toBeCloseTo(0.833, 2);
    expect(ratio(1, 0)).toBe(0);
  });

  it('finds the latest RFQ the supplier quoted on', () => {
    const row = (code: string, invitedAt: string, outcome: SupplierHistoryRow['outcome']): SupplierHistoryRow => ({ rfqId: code, code, title: code, invitedAt, unit: 'hộp', outcome });
    const rows = [row('A', '2025-08-12T00:00:00Z', 'awarded'), row('B', '2025-11-15T00:00:00Z', 'no_response'), row('C', '2025-10-01T00:00:00Z', 'pending')];
    expect(latestQuotedRow(rows)?.code).toBe('C');
    expect(latestQuotedRow([])).toBeUndefined();
  });
});
