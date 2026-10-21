import { mockApi as api } from './index';
import { resetMockDb } from './db';

/** End-to-end business flow through the mock backend: RFQ → quotation → comparison → award. */
describe('mock backend RFQ flow', () => {
  beforeEach(() => resetMockDb());

  const loginBuyer = () => api.auth.login({ email: 'hoang.tn@anphuoc.vn', password: '123456', role: 'buyer', remember: false });
  const loginSupplier = () => api.auth.login({ email: 'quan.td@tanphatpack.vn', password: '123456', role: 'supplier', remember: false });

  it('rejects a supplier account on the buyer portal', async () => {
    await expect(api.auth.login({ email: 'quan.td@tanphatpack.vn', password: '123456', role: 'buyer', remember: false })).rejects.toMatchObject({
      code: 'errors.wrongRole',
    });
  });

  it('lets the buyer create and send an RFQ that the invited supplier then quotes', async () => {
    await loginBuyer();
    const draft = await api.rfqs.createDraft({ supplierIds: ['sup-tanphat', 'sup-greenpack'] });
    await api.rfqs.updateDraft(draft.id, {
      title: 'Yêu cầu báo giá 2.000 hộp quà carton',
      categoryId: 'packaging',
      subcategory: 'Hộp carton',
      productName: 'Hộp quà carton in logo',
      quantity: 2000,
      unit: 'hộp',
      deliveryAddress: 'Tổng kho An Phước, TP. Thủ Đức',
      attachments: [{ id: 'a1', name: 'spec.pdf', sizeBytes: 1000 }],
    });
    const sent = await api.rfqs.send(draft.id);
    expect(sent.lifecycle).toBe('open');

    await loginSupplier();
    const inbox = await api.portal.inbox({ tab: 'new', sort: 'deadline' });
    expect(inbox.items.map((i) => i.rfq.id)).toContain(draft.id);

    const quote = await api.portal.submitQuotation(draft.id, {
      unitPrice: 12000,
      moq: 1000,
      leadTimeDays: 6,
      validityDays: 30,
      paymentTerms: 'Tạm ứng 50%, thanh toán 50% khi giao hàng',
      offerNotes: '',
      toolingCost: 0,
    });
    expect(quote.status).toBe('submitted');

    await loginBuyer();
    const detail = await api.rfqs.get(draft.id);
    expect(detail.quotations.map((q) => q.supplierId)).toContain('sup-tanphat');
    const notifications = await api.notifications.list();
    expect(notifications[0].title).toContain('Tân Phát');
  });

  it('rejects a quotation held for less time than the RFQ minimum validity', async () => {
    await loginSupplier();
    const values = { unitPrice: 7800, moq: 3000, leadTimeDays: 5, paymentTerms: 'Công nợ 30 ngày', offerNotes: '', toolingCost: 0 };
    await expect(api.portal.submitQuotation('rfq-2025-093', { ...values, validityDays: 15 })).rejects.toMatchObject({ code: 'errors.validityTooShort' });
    await expect(api.portal.submitQuotation('rfq-2025-093', { ...values, validityDays: 30 })).resolves.toMatchObject({ status: 'submitted' });
  });

  it('awards one quotation and marks the others as not selected, without creating any order', async () => {
    await loginBuyer();
    const rfq = await api.rfqs.award('rfq-2025-089', 'qt-0412');
    expect(rfq.lifecycle).toBe('awarded');
    const data = await api.rfqs.comparison('rfq-2025-089');
    const statuses = Object.fromEntries(data.quotations.map((q) => [q.supplierId, q.status]));
    expect(statuses).toEqual({ 'sup-tanphat': 'awarded', 'sup-tiendat': 'not_selected', 'sup-namkhang': 'not_selected' });

    await loginSupplier();
    const mine = await api.portal.quotations({ tab: 'awarded', page: 1, pageSize: 50 });
    expect(mine.items.some((i) => i.quotation.id === 'qt-0412')).toBe(true);
  });

  it('refuses to send an incomplete draft', async () => {
    await loginBuyer();
    const draft = await api.rfqs.createDraft();
    await expect(api.rfqs.send(draft.id)).rejects.toMatchObject({ code: 'errors.rfqIncomplete' });
  });
});
