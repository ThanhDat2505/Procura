import { mockApi as api, resetMockDb } from '@/services/mock';
import type { RfqDetail } from '@/services';
import { buildQuoteRows, buildRfqTimeline, filterQuoteRows, responseSummary, totalSpread } from './rfqDetailModel';

describe('rfqDetailModel (BUY-07)', () => {
  let detail: RfqDetail;

  beforeEach(async () => {
    resetMockDb();
    await api.auth.login({ email: 'hoang.tn@anphuoc.vn', password: '123456', role: 'buyer', remember: false });
    detail = await api.rfqs.get('rfq-2025-089');
  });

  it('summarises responses against non-declined invitees', () => {
    const s = responseSummary(detail);
    expect(s).toMatchObject({ invited: 4, received: 3, expected: 4, complete: false, canCompare: true });

    const declined: RfqDetail = {
      ...detail,
      invitations: detail.invitations.map((i) => (i.quotation ? i : { ...i, declinedAt: '2025-11-17T10:00:00.000Z' })),
    };
    expect(responseSummary(declined)).toMatchObject({ declined: 1, expected: 3, complete: true });
  });

  it('builds a 4-step timeline that stops at the award decision (no PO steps)', () => {
    const tl = buildRfqTimeline(detail);
    expect(tl.steps.map((s) => s.key)).toEqual(['published', 'viewed', 'quotes', 'decision']);
    expect(tl.steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'pending']);
    expect(tl.currentStep).toBe(3);
    expect(tl.steps[2]).toMatchObject({ variant: 'partial', values: { received: 3, expected: 4 } });
    expect(tl.steps[1].values.viewed).toBe(4);
  });

  it('marks every step done once a winner is chosen', async () => {
    await api.rfqs.award('rfq-2025-089', 'qt-0412');
    const tl = buildRfqTimeline(await api.rfqs.get('rfq-2025-089'));
    expect(tl.steps.every((s) => s.state === 'done')).toBe(true);
    expect(tl.currentStep).toBe(4);
    expect(tl.steps[3]).toMatchObject({ variant: 'awarded' });
    expect(String(tl.steps[3].values.supplier)).toContain('Tân Phát');
  });

  it('shows a draft as the current first step', () => {
    const draft: RfqDetail = { ...detail, rfq: { ...detail.rfq, lifecycle: 'draft' }, quotations: [], invitations: detail.invitations.map((i) => ({ ...i, viewedAt: undefined, quotation: undefined })) };
    const tl = buildRfqTimeline(draft);
    expect(tl.steps.map((s) => s.state)).toEqual(['current', 'pending', 'pending', 'pending']);
    expect(tl.currentStep).toBe(1);
  });

  it('lists quotes first, then silent invitees, and filters by MOQ fit', () => {
    const rows = buildQuoteRows(detail);
    expect(rows.map((r) => r.kind)).toEqual(['quote', 'quote', 'quote', 'pending']);
    const tienDat = rows.find((r) => r.kind === 'quote' && r.quotation.id === 'qt-td-089');
    expect(tienDat).toMatchObject({ moqFit: false, total: 82_000_000, lowestUnitPrice: true });
    const fit = filterQuoteRows(rows, true);
    expect(fit).toHaveLength(2);
    expect(fit.every((r) => r.kind === 'quote' && r.moqFit)).toBe(true);
  });

  it('computes the total spread of the selected quotes', () => {
    const rows = buildQuoteRows(detail);
    expect(totalSpread(rows, new Set(['qt-0412', 'qt-nk-089']))).toEqual({ amount: 2_000_000, ratio: 2_000_000 / 44_500_000 });
    expect(totalSpread(rows, new Set(['qt-0412']))).toBeNull();
  });
});
