import { compareQuotations, paymentFlexibility } from './comparison';
import { formatVnd } from './format';
import { vndToWords } from './quotation';
import { deadlineInfo, dimensionsError, formatDimensions, readinessChecks, rfqDisplayStatus, splitDimensions } from './rfq';
import { EMPTY_SUPPLIER_FILTERS, filterSuppliers, matchesMoqBand } from './supplierSearch';
import { quotations, rfqs } from '@/services/mock/seed/rfqs';
import { suppliers } from '@/services/mock/seed/suppliers';

const rfq089 = rfqs.find((r) => r.code === 'RFQ-2025-089')!;
const quotes089 = quotations.filter((q) => q.rfqId === rfq089.id);
const now = new Date('2025-11-18T09:30:00+07:00');

describe('compareQuotations (BUY-08)', () => {
  const result = compareQuotations(rfq089, quotes089, suppliers);

  it('forces the MOQ quantity into the total when MOQ exceeds the request', () => {
    const tienDat = result.rows.find((r) => r.supplier.shortName.startsWith('Tiến Đạt'))!;
    expect(tienDat.moqFit).toBe(false);
    expect(tienDat.total).toBe(82_000_000);
    expect(tienDat.moqExcess).toBe(5_000);
  });

  it('recommends Tân Phát, as in the approved design', () => {
    expect(result.recommended?.supplier.shortName).toBe('Tân Phát Packaging');
    expect(result.bestBudget?.total).toBe(42_500_000);
    expect(result.fastest?.supplier.shortName).toBe('Nam Khang Vina');
    expect(result.mostFlexiblePayment?.supplier.shortName).toBe('Nam Khang Vina');
  });

  it('flags the lowest unit price even when its MOQ does not fit', () => {
    expect(result.lowestUnitPrice?.quotation.unitPrice).toBe(8200);
  });

  it('classifies payment terms', () => {
    expect(paymentFlexibility('Tạm ứng 100% trước khi sản xuất')).toBe(1);
    expect(paymentFlexibility('Tạm ứng 50%, thanh toán 50% khi giao hàng')).toBe(2);
    expect(paymentFlexibility('Thanh toán công nợ 15 ngày sau khi giao hàng')).toBe(3);
  });
});

describe('RFQ rules', () => {
  it('derives display status from quote count', () => {
    expect(rfqDisplayStatus(rfq089, 3, now)).toBe('quoted');
    expect(rfqDisplayStatus(rfq089, 1, now)).toBe('awaiting');
    expect(rfqDisplayStatus(rfq089, 0, now)).toBe('open');
    expect(rfqDisplayStatus(rfq089, 0, new Date('2025-11-21T00:00:00+07:00'))).toBe('expired');
  });

  it('shows "Còn 2 ngày" urgency for RFQ-2025-089 at the demo anchor', () => {
    expect(deadlineInfo(rfq089.deadline, now)).toMatchObject({ daysLeft: 2, urgency: 'soon' });
  });

  it('marks a sent RFQ as ready on every check', () => {
    expect(readinessChecks(rfq089, now).every((c) => c.ok)).toBe(true);
  });
});

describe('RFQ dimensions (L × W × H)', () => {
  const dims = (length: string, width: string, height: string) => ({ length, width, height });

  it('splits size from the rest of a product spec', () => {
    expect(splitDimensions('25×18×10 cm, Kraft Nhật 140gsm')).toEqual({ dimensions: dims('25', '18', '10'), rest: 'Kraft Nhật 140gsm' });
    expect(splitDimensions('25x25x25').dimensions).toEqual(dims('25', '25', '25'));
    expect(splitDimensions('Theo thiết kế thương hiệu')).toEqual({ dimensions: null, rest: 'Theo thiết kế thương hiệu' });
  });

  it('formats to the stored "L × W × H cm" string, empty when blank', () => {
    expect(formatDimensions(dims('25', '18', '10'))).toBe('25 × 18 × 10 cm');
    expect(formatDimensions(dims('', ' ', ''))).toBe('');
    expect(splitDimensions(formatDimensions(dims('12.5', '8', '4'))).dimensions).toEqual(dims('12.5', '8', '4'));
  });

  it('requires all three sides or none, each greater than 0', () => {
    expect(dimensionsError(dims('', '', ''))).toBeUndefined();
    expect(dimensionsError(dims('25', '18', '10'))).toBeUndefined();
    expect(dimensionsError(dims('25', '', '10'))).toEqual({ side: 'width', message: 'validation.dimensionsIncomplete' });
    expect(dimensionsError(dims('25', '18', '0'))).toEqual({ side: 'height', message: 'validation.positive' });
  });
});

describe('formatting', () => {
  it('formats VND the Vietnamese way', () => {
    expect(formatVnd(42_500_000)).toBe('42.500.000 đ');
  });

  it('reads amounts in Vietnamese words', () => {
    expect(vndToWords(42_500_000)).toBe('Bốn mươi hai triệu năm trăm nghìn đồng');
    expect(vndToWords(1_005_000)).toBe('Một triệu không trăm lẻ năm nghìn đồng');
  });
});

describe('supplier search (BUY-02)', () => {
  it('matches without Vietnamese accents', () => {
    const found = filterSuppliers(suppliers, { ...EMPTY_SUPPLIER_FILTERS, query: 'bao bi carton' });
    expect(found.map((s) => s.id)).toContain('sup-tanphat');
  });

  it('filters by MOQ band', () => {
    expect(matchesMoqBand(3000, '1000to5000')).toBe(true);
    expect(matchesMoqBand(10000, '1000to5000')).toBe(false);
  });
});
