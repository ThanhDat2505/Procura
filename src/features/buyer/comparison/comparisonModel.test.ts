import { compareQuotations } from '@/domain/comparison';
import type { ComparisonData } from '@/services';
import { mockApi as api, resetMockDb } from '@/services/mock';
import { buildCsv, mergeCertifications, orderColumns, parseIds, selectComparedQuotes, visibleMatrixRows, MATRIX_ROWS } from './comparisonModel';

describe('comparisonModel (BUY-08)', () => {
  let data: ComparisonData;

  beforeEach(async () => {
    resetMockDb();
    await api.auth.login({ email: 'hoang.tn@anphuoc.vn', password: '123456', role: 'buyer', remember: false });
    data = await api.rfqs.comparison('rfq-2025-089');
  });

  it('shows every criterion in full mode and only differing ones in diff mode', () => {
    const result = compareQuotations(data.rfq, data.quotations, data.suppliers);
    expect(visibleMatrixRows(result.rows, 'all')).toEqual([...MATRIX_ROWS]);

    // Make two quotes identical on payment, validity and tooling.
    const [a, b] = data.quotations;
    const same = [a, { ...b, paymentTerms: a.paymentTerms, validityDays: a.validityDays, toolingCost: a.toolingCost, toolingNote: a.toolingNote }];
    const rows = compareQuotations(data.rfq, same, data.suppliers).rows;
    const diff = visibleMatrixRows(rows, 'diff');
    expect(diff).not.toContain('payment');
    expect(diff).not.toContain('validity');
    expect(diff).not.toContain('tooling');
    expect(diff).toEqual(expect.arrayContaining(['unitPrice', 'moq', 'leadTime']));
  });

  it('hides every row in diff mode for a single quote', () => {
    const rows = compareQuotations(data.rfq, data.quotations.slice(0, 1), data.suppliers).rows;
    expect(visibleMatrixRows(rows, 'diff')).toEqual([]);
  });

  it('restricts the compared quotes by ids and drops rejected quotes while open', () => {
    expect(selectComparedQuotes(data.rfq, data.quotations, null)).toHaveLength(3);
    expect(selectComparedQuotes(data.rfq, data.quotations, ['qt-0412', 'qt-nk-089']).map((q) => q.id)).toEqual(['qt-0412', 'qt-nk-089']);
    expect(selectComparedQuotes(data.rfq, data.quotations, ['unknown'])).toHaveLength(3);

    const rejected = data.quotations.map((q) => (q.id === 'qt-td-089' ? { ...q, status: 'not_selected' as const } : q));
    expect(selectComparedQuotes(data.rfq, rejected, null).map((q) => q.id)).not.toContain('qt-td-089');
    // After the award every loser is "not selected" but must stay visible.
    expect(selectComparedQuotes({ lifecycle: 'awarded' }, rejected, null)).toHaveLength(3);
  });

  it('puts the highlighted quote first', () => {
    const rows = compareQuotations(data.rfq, data.quotations, data.suppliers).rows;
    expect(orderColumns(rows, 'qt-nk-089')[0].quotation.id).toBe('qt-nk-089');
    expect(orderColumns(rows, undefined)).toBe(rows);
  });

  it('merges supplier and quote certifications without near-duplicates', () => {
    expect(mergeCertifications(['ISO 9001:2015', 'FSC CoC'], ['ISO 9001', 'FSC', 'BRC'])).toEqual(['ISO 9001:2015', 'FSC CoC', 'BRC']);
    expect(mergeCertifications([], ['ISO 14001', 'RoHS'])).toEqual(['ISO 14001', 'RoHS']);
  });

  it('parses the ids query parameter', () => {
    expect(parseIds(null)).toBeNull();
    expect(parseIds(' a, b ,,')).toEqual(['a', 'b']);
    expect(parseIds(',')).toBeNull();
  });

  it('builds an Excel-friendly CSV with escaping', () => {
    const csv = buildCsv(['Tiêu chí', 'Bao Bì "A"'], [['Thanh toán', 'Tạm ứng 50%, còn lại sau'], ['Điểm', 87]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['Tiêu chí,"Bao Bì ""A"""', 'Thanh toán,"Tạm ứng 50%, còn lại sau"', 'Điểm,87', '']);
  });
});
