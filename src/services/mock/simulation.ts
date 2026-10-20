import { clock } from '@/domain/clock';
import type { Quotation, Rfq } from '@/domain/types';
import { DEMO_ACCOUNT_IDS } from './seed/organizations';
import { db, nextId, persist } from './db';
import { findSupplier, hash01, notify } from './helpers';

/**
 * Simulated supplier behaviour. Suppliers without a demo login cannot act in the UI, so when the buyer
 * sends an RFQ the mock backend schedules plausible replies from them a few seconds later.
 * The demo supplier account (Tân Phát) is never simulated – it answers through the Supplier Portal.
 */

const demoSupplierIds = () => new Set(db.users.filter((u) => DEMO_ACCOUNT_IDS.includes(u.id) && u.role === 'supplier').map((u) => u.organizationId));

export function scheduleSupplierReplies(rfq: Rfq): void {
  const humanSuppliers = demoSupplierIds();
  const nowReal = Date.now();
  rfq.invitations
    .filter((inv) => !humanSuppliers.has(inv.supplierId))
    .forEach((inv, i) => {
      // ~75% of suppliers reply; replies arrive 6–30 s apart so the buyer can watch quotes come in.
      if (hash01(rfq.id + inv.supplierId) < 0.25) return;
      db.simulations.push({ rfqId: rfq.id, supplierId: inv.supplierId, dueAt: nowReal + 6000 + i * 8000 });
    });
}

function referenceUnitPrice(rfq: Rfq, supplierId: string): number {
  if (rfq.budgetMax && rfq.quantity > 0) return rfq.budgetMax / rfq.quantity;
  const product = db.products.find((p) => p.supplierId === supplierId && p.group === rfq.subcategory);
  if (product) return (product.priceMin + product.priceMax) / 2;
  return 10000;
}

function roundPrice(v: number): number {
  const step = v >= 100000 ? 1000 : v >= 10000 ? 100 : 50;
  return Math.round(v / step) * step;
}

/** Applies every due simulation. Called at the start of each mock API call. */
export function processSimulations(): void {
  const due = db.simulations.filter((s) => s.dueAt <= Date.now());
  if (due.length === 0) return;
  db.simulations = db.simulations.filter((s) => s.dueAt > Date.now());

  for (const sim of due) {
    const rfq = db.rfqs.find((r) => r.id === sim.rfqId);
    if (!rfq || rfq.lifecycle !== 'open') continue;
    if (db.quotations.some((q) => q.rfqId === rfq.id && q.supplierId === sim.supplierId && q.status !== 'draft')) continue;
    const supplier = findSupplier(sim.supplierId);
    const r = hash01(rfq.id + supplier.id + 'price');
    const now = clock.nowIso();
    const inv = rfq.invitations.find((i) => i.supplierId === supplier.id);
    if (inv && !inv.viewedAt) inv.viewedAt = now;

    db.sequence.quotation += 1;
    const quote: Quotation = {
      id: nextId('qt'),
      code: `QT-2025-${String(db.sequence.quotation).padStart(4, '0')}`,
      rfqId: rfq.id,
      supplierId: supplier.id,
      unitPrice: roundPrice(referenceUnitPrice(rfq, supplier.id) * (0.86 + r * 0.22)),
      moq: Math.max(supplier.moq, 1) <= rfq.quantity || r > 0.5 ? Math.min(supplier.moq, rfq.quantity) : supplier.moq,
      leadTimeDays: supplier.leadTimeMinDays + Math.round(r * (supplier.leadTimeMaxDays - supplier.leadTimeMinDays)),
      validityDays: r > 0.6 ? 45 : 30,
      paymentTerms: r > 0.66 ? 'Thanh toán công nợ 15 ngày sau khi giao hàng' : r > 0.33 ? 'Tạm ứng 50%, thanh toán 50% khi giao hàng' : 'Tạm ứng 100% trước khi sản xuất',
      samplePolicy: rfq.terms.sampleRequired ? `Gửi ${rfq.terms.sampleQuantity} mẫu thử trong 72h` : '',
      toolingCost: r > 0.5 ? 0 : 1_000_000,
      toolingNote: r > 0.5 ? 'Miễn phí khuôn & mẫu thử' : 'Phí khuôn 1.000.000 đ',
      offerNotes: '',
      vatIncluded: false,
      certifications: supplier.certificates.filter((c) => c.status === 'verified').map((c) => c.code),
      attachments: [],
      status: 'submitted',
      createdAt: now,
      submittedAt: now,
      updatedAt: now,
    };
    db.quotations.push(quote);
    rfq.events.push({ id: nextId('ev'), type: 'quote_received', at: now, supplierId: supplier.id });
    notify(rfq.ownerId, 'quote_received', `${supplier.name} đã gửi báo giá`, `${rfq.code} · ${quote.unitPrice.toLocaleString('vi-VN')} đ/${rfq.unit}`, `/buyer/rfqs/${rfq.id}`);
  }
  persist();
}
