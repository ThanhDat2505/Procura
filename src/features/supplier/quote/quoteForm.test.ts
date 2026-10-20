import { quotations, rfqs } from '@/services/mock/seed/rfqs';
import { addWorkingDays, defaultFormValues, defaultValidityDays, draftPayload, moqCheck, paymentTermOptions, quoteMode } from './quoteForm';

const now = new Date('2025-11-18T09:30:00+07:00');
const rfq089 = rfqs.find((r) => r.id === 'rfq-2025-089')!;
const qt0412 = quotations.find((q) => q.id === 'qt-0412')!;

describe('quoteMode', () => {
  it('is "new" without a quotation and "editingSubmitted" for a submitted one before the deadline', () => {
    expect(quoteMode({ rfq: rfq089, declined: false }, now)).toEqual({ mode: 'new' });
    expect(quoteMode({ rfq: rfq089, quotation: qt0412, declined: false }, now)).toEqual({ mode: 'editingSubmitted' });
    expect(quoteMode({ rfq: rfq089, quotation: { ...qt0412, status: 'draft' }, declined: false }, now)).toEqual({ mode: 'drafting' });
  });

  it('is read-only after the deadline, when closed, decided or declined', () => {
    const late = new Date('2025-11-21T09:00:00+07:00');
    expect(quoteMode({ rfq: rfq089, quotation: qt0412, declined: false }, late)).toEqual({ mode: 'readOnly', reason: 'expired' });
    expect(quoteMode({ rfq: { ...rfq089, lifecycle: 'awarded' }, declined: false }, now)).toEqual({ mode: 'readOnly', reason: 'closed' });
    expect(quoteMode({ rfq: rfq089, quotation: { ...qt0412, status: 'not_selected' }, declined: false }, now)).toEqual({ mode: 'readOnly', reason: 'locked' });
    expect(quoteMode({ rfq: rfq089, declined: true }, now)).toEqual({ mode: 'readOnly', reason: 'declined' });
  });
});

describe('moqCheck', () => {
  it('compares the MOQ with the requested quantity', () => {
    expect(moqCheck(undefined, 5000)).toBe('empty');
    expect(moqCheck(Number.NaN, 5000)).toBe('empty');
    expect(moqCheck(3000, 5000)).toBe('fits');
    expect(moqCheck(5000, 5000)).toBe('fits');
    expect(moqCheck(10000, 5000)).toBe('exceeds');
  });
});

describe('addWorkingDays', () => {
  it('skips weekends', () => {
    // Tue 18/11/2025 + 5 working days = Tue 25/11/2025
    const d = addWorkingDays(new Date(2025, 10, 18, 9, 30), 5);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 10, 25]);
    // Fri 21/11/2025 + 1 working day = Mon 24/11/2025
    const m = addWorkingDays(new Date(2025, 10, 21), 1);
    expect(m.getDate()).toBe(24);
  });
});

describe('form defaults', () => {
  it('uses the buyer terms for a new quotation', () => {
    const v = defaultFormValues(rfq089);
    expect(v.unitPrice).toBeUndefined();
    expect(v.paymentTerms).toBe(rfq089.terms.paymentTerms);
    expect(v.validityDays).toBe(30);
  });

  it('prefills from an existing quotation', () => {
    const v = defaultFormValues(rfq089, qt0412);
    expect(v).toMatchObject({ unitPrice: 8500, moq: 3000, leadTimeDays: 5, validityDays: 30 });
  });

  it('picks the smallest validity option meeting the buyer minimum', () => {
    expect(defaultValidityDays(10)).toBe(15);
    expect(defaultValidityDays(31)).toBe(45);
    expect(defaultValidityDays(90)).toBe(60);
  });

  it('lists payment terms without duplicates, buyer terms first', () => {
    const list = paymentTermOptions('Điều khoản riêng', 'Điều khoản riêng');
    expect(list[0]).toBe('Điều khoản riêng');
    expect(new Set(list).size).toBe(list.length);
  });

  it('drops empty numbers from a draft payload', () => {
    expect(draftPayload({ unitPrice: Number.NaN, moq: 3000, offerNotes: '' })).toEqual({ moq: 3000 });
  });
});
