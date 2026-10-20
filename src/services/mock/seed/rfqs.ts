import { DEFAULT_WEIGHTS } from '@/domain/rfq';
import type { CategoryId, Quotation, QuotationStatus, Rfq, RfqEvent, RfqInvitation, RfqLifecycle, RfqTerms } from '@/domain/types';
import { BUYER_ANPHUOC } from './organizations';
import { SUP_GREENPACK, SUP_HUNGTHINH, SUP_NAMKHANG, SUP_TANPHAT, SUP_TIENDAT } from './suppliers';

/**
 * RFQs and quotations. All timestamps are Vietnam time (+07:00) around the demo anchor 18/11/2025 09:30.
 * RFQ-2025-089 reproduces BUY-07 / BUY-08 / SUP-04b exactly.
 */

const t = (local: string) => new Date(`${local}:00+07:00`).toISOString();

const baseTerms = (over: Partial<RfqTerms> = {}): RfqTerms => ({
  vatIncluded: false,
  currency: 'VND',
  paymentTerms: 'Tạm ứng 50%, thanh toán 50% còn lại khi nhận đủ hàng',
  minValidityDays: 30,
  sampleRequired: false,
  sampleQuantity: 0,
  sampleNote: '',
  requiredCertifications: [],
  weights: { ...DEFAULT_WEIGHTS },
  notesToSuppliers: '',
  ...over,
});

interface RfqSeed {
  id: string;
  code: string;
  title: string;
  buyerCompanyId?: string;
  ownerId?: string;
  categoryId: CategoryId;
  subcategory: string;
  productName: string;
  quantity: number;
  unit: string;
  createdAt: string;
  deadline: string;
  neededBy: string;
  lifecycle: RfqLifecycle;
  invited: { supplierId: string; viewedAt?: string; declinedAt?: string }[];
  dimensions?: string;
  material?: string;
  finishing?: string;
  deliveryAddress?: string;
  budgetMin?: number;
  budgetMax?: number;
  terms?: Partial<RfqTerms>;
  priority?: Rfq['priority'];
  priorityNote?: string;
  buyerNote?: string;
  attachments?: Rfq['attachments'];
  completedStep?: number;
}

const ANPHUOC_WAREHOUSE = 'Tổng kho An Phước Logistics, Đường số 9, KCN Cát Lái 2, P. Thạnh Mỹ Lợi, TP. Thủ Đức, TP.HCM';

function makeRfq(s: RfqSeed): Rfq {
  const sent = s.lifecycle !== 'draft';
  const invitations: RfqInvitation[] = s.invited.map((i) => ({ supplierId: i.supplierId, sentAt: s.createdAt, viewedAt: i.viewedAt, declinedAt: i.declinedAt }));
  const events: RfqEvent[] = [{ id: `${s.id}-e1`, type: 'created', at: s.createdAt }];
  if (sent) events.push({ id: `${s.id}-e2`, type: 'sent', at: s.createdAt, note: String(invitations.length) });
  return {
    id: s.id,
    code: s.code,
    title: s.title,
    buyerCompanyId: s.buyerCompanyId ?? BUYER_ANPHUOC,
    ownerId: s.ownerId ?? 'u-hoang',
    categoryId: s.categoryId,
    subcategory: s.subcategory,
    productName: s.productName,
    dimensions: s.dimensions ?? '',
    material: s.material ?? '',
    finishing: s.finishing ?? '',
    quantity: s.quantity,
    unit: s.unit,
    attachments: s.attachments ?? [],
    deliveryAddress: s.deliveryAddress ?? ANPHUOC_WAREHOUSE,
    deadline: s.deadline,
    neededBy: s.neededBy,
    priority: s.priority ?? 'normal',
    priorityNote: s.priorityNote,
    buyerNote: s.buyerNote,
    budgetMin: s.budgetMin,
    budgetMax: s.budgetMax,
    terms: baseTerms(s.terms),
    invitations,
    lifecycle: s.lifecycle,
    events,
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
    sentAt: sent ? s.createdAt : undefined,
    completedStep: sent ? 4 : (s.completedStep ?? 1),
  };
}

interface QuoteSeed {
  id: string;
  code: string;
  rfqId: string;
  supplierId: string;
  unitPrice: number;
  moq: number;
  leadTimeDays: number;
  submittedAt: string;
  status: QuotationStatus;
  validityDays?: number;
  paymentTerms?: string;
  samplePolicy?: string;
  toolingCost?: number;
  toolingNote?: string;
  offerNotes?: string;
  technicalNotes?: string;
  certifications?: string[];
  buyerFeedback?: string;
  viewedAt?: string;
}

function makeQuote(s: QuoteSeed): Quotation {
  return {
    id: s.id,
    code: s.code,
    rfqId: s.rfqId,
    supplierId: s.supplierId,
    unitPrice: s.unitPrice,
    moq: s.moq,
    leadTimeDays: s.leadTimeDays,
    validityDays: s.validityDays ?? 30,
    paymentTerms: s.paymentTerms ?? 'Tạm ứng 50%, thanh toán 50% khi giao hàng',
    samplePolicy: s.samplePolicy ?? '',
    toolingCost: s.toolingCost ?? 0,
    toolingNote: s.toolingNote,
    offerNotes: s.offerNotes ?? '',
    technicalNotes: s.technicalNotes,
    vatIncluded: false,
    certifications: s.certifications ?? [],
    attachments: [],
    status: s.status,
    createdAt: s.submittedAt,
    submittedAt: s.status === 'draft' ? undefined : s.submittedAt,
    updatedAt: s.submittedAt,
    viewedAt: s.viewedAt ?? (s.status === 'viewed' || s.status === 'awarded' || s.status === 'not_selected' ? s.submittedAt : undefined),
    decidedAt: s.status === 'awarded' || s.status === 'not_selected' ? s.submittedAt : undefined,
    buyerFeedback: s.buyerFeedback,
  };
}

// ---------------------------------------------------------------------------
// An Phước Logistics (demo buyer) – 12 RFQs, as listed on BUY-05
// ---------------------------------------------------------------------------

export const RFQ_089 = 'rfq-2025-089';

const anPhuocRfqs: Rfq[] = [
  makeRfq({
    id: RFQ_089,
    code: 'RFQ-2025-089',
    title: 'Yêu cầu báo giá 5.000 hộp carton sóng E 3 lớp in logo thương hiệu',
    categoryId: 'packaging',
    subcategory: 'Hộp carton',
    productName: 'Hộp carton sóng E 3 lớp in logo',
    dimensions: '25 × 18 × 10 cm',
    material: 'Giấy Kraft nâu Nhật 140gsm, sóng E',
    finishing: 'In Flexo 2 màu (Xanh dương Pantone 293C + Đen), phủ bóng bảo vệ bề mặt chống thấm nhẹ',
    quantity: 5000,
    unit: 'hộp',
    createdAt: t('2025-11-15T09:30'),
    deadline: t('2025-11-20T17:00'),
    neededBy: t('2025-12-05T17:00'),
    lifecycle: 'open',
    priority: 'high',
    priorityNote: 'Chuỗi cung ứng đóng gói Q4',
    buyerNote: 'Ưu tiên nhà cung ứng có năng lực sản xuất mẫu thử trong vòng 48h sau duyệt giá. Sản phẩm bắt buộc đạt chuẩn độ bục nén màng sóng E.',
    budgetMin: 40_000_000,
    budgetMax: 45_000_000,
    attachments: [{ id: 'att-089-1', name: 'Ban_ve_ky_thuat_HopCarton_v2.pdf', sizeBytes: 1_887_437, description: 'Bản vẽ thiết kế dao cắt & khuôn in' }],
    terms: {
      paymentTerms: 'Tạm ứng 50%, thanh toán 50% còn lại khi nhận đủ hàng',
      sampleRequired: true,
      sampleQuantity: 2,
      sampleNote: 'Bắt buộc gửi 02 hộp mẫu thực tế để test lực nén trước khi chạy dây chuyền hàng loạt',
      requiredCertifications: ['ISO 9001', 'FSC'],
      notesToSuppliers: 'Yêu cầu kiểm tra kỹ định lượng giấy Kraft Nhật 140gsm và độ bền chịu nén bục sóng E. Giao hàng tại Tổng kho An Phước Logistics, TP. Thủ Đức.',
    },
    invited: [
      { supplierId: SUP_TANPHAT, viewedAt: t('2025-11-16T08:10') },
      { supplierId: SUP_TIENDAT, viewedAt: t('2025-11-16T10:45') },
      { supplierId: SUP_NAMKHANG, viewedAt: t('2025-11-16T14:15') },
      { supplierId: SUP_HUNGTHINH, viewedAt: t('2025-11-17T16:20') },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-088',
    code: 'RFQ-2025-088',
    title: '200 bộ bàn ghế văn phòng modular',
    categoryId: 'furniture',
    subcategory: 'Bàn ghế văn phòng',
    productName: 'Bộ bàn ghế văn phòng modular 1m2',
    dimensions: 'Bàn 120 × 60 × 75 cm',
    material: 'Mặt MFC chống trầy, chân sắt sơn tĩnh điện',
    quantity: 200,
    unit: 'bộ',
    createdAt: t('2025-11-12T10:00'),
    deadline: t('2025-11-24T15:00'),
    neededBy: t('2025-12-15T17:00'),
    lifecycle: 'open',
    budgetMax: 120_000_000,
    invited: [
      { supplierId: 'sup-tana', viewedAt: t('2025-11-12T15:00') },
      { supplierId: 'sup-minhduc', viewedAt: t('2025-11-13T09:00') },
      { supplierId: 'sup-achau', viewedAt: t('2025-11-13T11:00') },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-086',
    code: 'RFQ-2025-086',
    title: '10 tấn màng co nhiệt PE',
    categoryId: 'chemicals',
    subcategory: 'Màng PE',
    productName: 'Màng co nhiệt PE 25 micron',
    material: 'LDPE nguyên sinh',
    quantity: 10,
    unit: 'tấn',
    createdAt: t('2025-11-10T14:00'),
    deadline: t('2025-11-22T12:00'),
    neededBy: t('2025-12-01T17:00'),
    lifecycle: 'open',
    budgetMax: 380_000_000,
    invited: [
      { supplierId: 'sup-daiphat', viewedAt: t('2025-11-10T16:00') },
      { supplierId: 'sup-vietthang', viewedAt: t('2025-11-11T08:30') },
      { supplierId: SUP_NAMKHANG, viewedAt: t('2025-11-11T10:00') },
      { supplierId: SUP_HUNGTHINH },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-084',
    code: 'RFQ-2025-084',
    title: 'Đồng phục & bảo hộ lao động Q4',
    categoryId: 'apparel',
    subcategory: 'Đồng phục BHLĐ',
    productName: 'Bộ đồng phục kỹ thuật kèm áo phản quang',
    quantity: 500,
    unit: 'bộ',
    createdAt: t('2025-11-14T08:00'),
    deadline: t('2025-11-28T18:00'),
    neededBy: t('2025-12-20T17:00'),
    lifecycle: 'open',
    ownerId: 'u-bao',
    invited: [
      { supplierId: 'sup-saigonpro', viewedAt: t('2025-11-14T13:00') },
      { supplierId: 'sup-anvietbh', viewedAt: t('2025-11-15T09:00') },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-087',
    code: 'RFQ-2025-087',
    title: '10.000 túi zipper Kraft đáy đứng',
    categoryId: 'packaging',
    subcategory: 'Túi giấy',
    productName: 'Túi zipper Kraft đáy đứng có cửa sổ',
    quantity: 10000,
    unit: 'cái',
    createdAt: t('2025-11-16T09:00'),
    deadline: t('2025-11-30T17:00'),
    neededBy: t('2025-12-12T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_GREENPACK, viewedAt: t('2025-11-16T14:00') }, { supplierId: 'sup-daiphat' }, { supplierId: SUP_HUNGTHINH }],
  }),
  makeRfq({
    id: 'rfq-2025-093',
    code: 'RFQ-2025-093',
    title: '3.000 hộp carton nắp gài in 1 màu',
    categoryId: 'packaging',
    subcategory: 'Hộp carton',
    productName: 'Hộp carton nắp gài không băng keo',
    dimensions: '20 × 15 × 8 cm',
    material: 'Giấy Kraft 125gsm, sóng E',
    finishing: 'In Flexo 1 màu',
    quantity: 3000,
    unit: 'hộp',
    createdAt: t('2025-11-17T15:30'),
    deadline: t('2025-11-25T17:00'),
    neededBy: t('2025-12-10T17:00'),
    lifecycle: 'open',
    budgetMax: 25_000_000,
    invited: [{ supplierId: SUP_TANPHAT }, { supplierId: SUP_GREENPACK }, { supplierId: 'sup-phucthinh' }],
  }),
  makeRfq({
    id: 'rfq-2025-091',
    code: 'RFQ-2025-091',
    title: 'Thùng carton 5 lớp xuất khẩu',
    categoryId: 'packaging',
    subcategory: 'Thùng carton',
    productName: 'Thùng carton 5 lớp sóng BC',
    quantity: 15000,
    unit: 'cái',
    createdAt: t('2025-11-17T11:00'),
    deadline: t('2025-11-29T17:00'),
    neededBy: t('2025-12-20T17:00'),
    lifecycle: 'draft',
    invited: [],
    completedStep: 1,
  }),
  makeRfq({
    id: 'rfq-2025-090',
    code: 'RFQ-2025-090',
    title: 'Túi zipper PE in logo',
    categoryId: 'packaging',
    subcategory: 'Túi nhựa',
    productName: 'Túi zipper PE in logo 2 mặt',
    quantity: 20000,
    unit: 'cái',
    createdAt: t('2025-11-16T16:00'),
    deadline: t('2025-11-30T17:00'),
    neededBy: t('2025-12-15T17:00'),
    lifecycle: 'draft',
    invited: [],
    completedStep: 0,
  }),
  makeRfq({
    id: 'rfq-2025-079',
    code: 'RFQ-2025-079',
    title: '3.000 cuộn băng keo OPP 48mm 100 yard',
    categoryId: 'packaging',
    subcategory: 'Vật tư tiêu hao',
    productName: 'Băng keo OPP trong 48mm × 100 yard',
    quantity: 3000,
    unit: 'cuộn',
    createdAt: t('2025-11-05T09:00'),
    deadline: t('2025-11-14T17:00'),
    neededBy: t('2025-11-25T17:00'),
    lifecycle: 'awarded',
    budgetMax: 48_300_000,
    invited: [
      { supplierId: SUP_NAMKHANG, viewedAt: t('2025-11-05T11:00') },
      { supplierId: SUP_TIENDAT, viewedAt: t('2025-11-05T14:00') },
      { supplierId: SUP_HUNGTHINH, viewedAt: t('2025-11-06T09:00') },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-081',
    code: 'RFQ-2025-081',
    title: '2.000 pallet gỗ keo xử lý nhiệt HT',
    categoryId: 'industrial',
    subcategory: 'Pallet',
    productName: 'Pallet gỗ keo 1200 × 1000 mm xử lý nhiệt',
    quantity: 2000,
    unit: 'tấm',
    createdAt: t('2025-11-03T10:00'),
    deadline: t('2025-11-12T17:00'),
    neededBy: t('2025-11-30T17:00'),
    lifecycle: 'cancelled',
    invited: [{ supplierId: 'sup-hoanggia', viewedAt: t('2025-11-03T15:00') }],
  }),
  makeRfq({
    id: 'rfq-2025-072',
    code: 'RFQ-2025-072',
    title: '10.000 thùng carton 3 lớp sóng B',
    categoryId: 'packaging',
    subcategory: 'Thùng carton',
    productName: 'Thùng carton 3 lớp sóng B',
    quantity: 10000,
    unit: 'thùng',
    createdAt: t('2025-08-12T09:00'),
    deadline: t('2025-08-20T17:00'),
    neededBy: t('2025-09-05T17:00'),
    lifecycle: 'awarded',
    budgetMax: 110_000_000,
    invited: [
      { supplierId: SUP_TANPHAT, viewedAt: t('2025-08-12T10:00') },
      { supplierId: SUP_TIENDAT, viewedAt: t('2025-08-12T13:00') },
      { supplierId: 'sup-phucthinh', viewedAt: t('2025-08-12T15:00') },
      { supplierId: SUP_NAMKHANG, viewedAt: t('2025-08-13T09:00') },
    ],
  }),
  makeRfq({
    id: 'rfq-2025-055',
    code: 'RFQ-2025-055',
    title: '3.000 hộp quà Tết bồi carton in offset',
    categoryId: 'packaging',
    subcategory: 'Hộp cứng',
    productName: 'Hộp quà Tết bồi carton in offset',
    quantity: 3000,
    unit: 'hộp',
    createdAt: t('2025-05-20T09:00'),
    deadline: t('2025-05-28T17:00'),
    neededBy: t('2025-06-20T17:00'),
    lifecycle: 'awarded',
    budgetMax: 60_000_000,
    invited: [
      { supplierId: SUP_TANPHAT, viewedAt: t('2025-05-20T11:00') },
      { supplierId: 'sup-donga', viewedAt: t('2025-05-21T09:00') },
      { supplierId: 'sup-phucthinh', viewedAt: t('2025-05-21T10:00') },
    ],
  }),
];

const anPhuocQuotes: Quotation[] = [
  // RFQ-2025-089 — the three quotes on BUY-08
  makeQuote({
    id: 'qt-0412',
    code: 'QT-2025-0412',
    rfqId: RFQ_089,
    supplierId: SUP_TANPHAT,
    unitPrice: 8500,
    moq: 3000,
    leadTimeDays: 5,
    submittedAt: t('2025-11-17T14:28'),
    status: 'viewed',
    viewedAt: t('2025-11-18T08:00'),
    validityDays: 30,
    paymentTerms: 'Tạm ứng 50%, thanh toán 50% khi nhận hàng & kiểm tra chất lượng',
    samplePolicy: 'Đồng ý gửi 02 hộp mẫu test màu in Flexo miễn phí trong vòng 48h',
    toolingCost: 0,
    toolingNote: 'Miễn phí mẫu thử & phí khuôn cho đơn từ 5.000 cái',
    offerNotes: 'Miễn phí khuôn in và mẫu thử cho đơn 5.000 cái. Đổi trả 1-1 trong vòng 7 ngày nếu lỗi dán keo hoặc sai màu thương hiệu.',
    technicalNotes: 'Đảm bảo đúng giấy Kraft Nhật định lượng 140gsm, độ nén bục tiêu chuẩn xuất khẩu. In ấn công nghệ Flexo 2 màu sắc nét theo đúng bản thiết kế kỹ thuật Bên mua.',
    certifications: ['ISO 9001', 'FSC'],
  }),
  makeQuote({
    id: 'qt-td-089',
    code: 'QT-2025-0405',
    rfqId: RFQ_089,
    supplierId: SUP_TIENDAT,
    unitPrice: 8200,
    moq: 10000,
    leadTimeDays: 7,
    submittedAt: t('2025-11-16T16:40'),
    status: 'viewed',
    validityDays: 15,
    paymentTerms: 'Tạm ứng 100% trước khi sản xuất',
    toolingCost: 1_500_000,
    toolingNote: 'Phí khuôn 1.500.000 đ (hoàn lại từ đơn thứ 2)',
    certifications: ['ISO 9001', 'BRC'],
  }),
  makeQuote({
    id: 'qt-nk-089',
    code: 'QT-2025-0408',
    rfqId: RFQ_089,
    supplierId: SUP_NAMKHANG,
    unitPrice: 8900,
    moq: 2000,
    leadTimeDays: 3,
    submittedAt: t('2025-11-17T09:15'),
    status: 'viewed',
    validityDays: 45,
    paymentTerms: 'Thanh toán công nợ 15 ngày sau khi giao hàng',
    toolingCost: 0,
    toolingNote: 'Miễn phí khuôn & mẫu thử',
    certifications: ['ISO 14001', 'RoHS'],
  }),
  // RFQ-2025-088
  makeQuote({ id: 'qt-088-1', code: 'QT-2025-0398', rfqId: 'rfq-2025-088', supplierId: 'sup-tana', unitPrice: 580000, moq: 20, leadTimeDays: 10, submittedAt: t('2025-11-15T10:00'), status: 'submitted', paymentTerms: 'Tạm ứng 30%, thanh toán 70% sau khi lắp đặt' }),
  makeQuote({ id: 'qt-088-2', code: 'QT-2025-0401', rfqId: 'rfq-2025-088', supplierId: 'sup-minhduc', unitPrice: 615000, moq: 30, leadTimeDays: 14, submittedAt: t('2025-11-16T11:00'), status: 'submitted', paymentTerms: 'Công nợ 30 ngày sau khi bàn giao' }),
  // RFQ-2025-086 (unit price per tấn)
  makeQuote({ id: 'qt-086-1', code: 'QT-2025-0390', rfqId: 'rfq-2025-086', supplierId: 'sup-daiphat', unitPrice: 37_500_000, moq: 5, leadTimeDays: 5, submittedAt: t('2025-11-12T09:00'), status: 'viewed' }),
  makeQuote({ id: 'qt-086-2', code: 'QT-2025-0393', rfqId: 'rfq-2025-086', supplierId: 'sup-vietthang', unitPrice: 36_800_000, moq: 10, leadTimeDays: 9, submittedAt: t('2025-11-13T10:00'), status: 'viewed', paymentTerms: 'Tạm ứng 100% trước khi giao hàng' }),
  makeQuote({ id: 'qt-086-3', code: 'QT-2025-0396', rfqId: 'rfq-2025-086', supplierId: SUP_NAMKHANG, unitPrice: 38_900_000, moq: 2, leadTimeDays: 4, submittedAt: t('2025-11-14T15:00'), status: 'submitted', paymentTerms: 'Công nợ 15 ngày sau khi giao hàng' }),
  // RFQ-2025-084, RFQ-2025-087 – one quote each (cannot compare yet)
  makeQuote({ id: 'qt-084-1', code: 'QT-2025-0402', rfqId: 'rfq-2025-084', supplierId: 'sup-saigonpro', unitPrice: 385000, moq: 100, leadTimeDays: 12, submittedAt: t('2025-11-17T10:00'), status: 'submitted' }),
  makeQuote({ id: 'qt-087-1', code: 'QT-2025-0410', rfqId: 'rfq-2025-087', supplierId: SUP_GREENPACK, unitPrice: 3150, moq: 5000, leadTimeDays: 6, submittedAt: t('2025-11-17T16:00'), status: 'submitted' }),
  // RFQ-2025-079 – awarded to Nam Khang
  makeQuote({ id: 'qt-079-1', code: 'QT-2025-0360', rfqId: 'rfq-2025-079', supplierId: SUP_NAMKHANG, unitPrice: 14200, moq: 1000, leadTimeDays: 3, submittedAt: t('2025-11-08T09:00'), status: 'awarded', paymentTerms: 'Công nợ 15 ngày sau khi giao hàng' }),
  makeQuote({ id: 'qt-079-2', code: 'QT-2025-0362', rfqId: 'rfq-2025-079', supplierId: SUP_TIENDAT, unitPrice: 13900, moq: 5000, leadTimeDays: 6, submittedAt: t('2025-11-09T10:00'), status: 'not_selected', buyerFeedback: 'MOQ không phù hợp số lượng đặt' }),
  makeQuote({ id: 'qt-079-3', code: 'QT-2025-0363', rfqId: 'rfq-2025-079', supplierId: SUP_HUNGTHINH, unitPrice: 15100, moq: 1000, leadTimeDays: 5, submittedAt: t('2025-11-10T11:00'), status: 'not_selected', buyerFeedback: 'Giá cao hơn đối thủ' }),
  // RFQ-2025-072 – awarded to Tân Phát
  makeQuote({ id: 'qt-0398', code: 'QT-2025-0298', rfqId: 'rfq-2025-072', supplierId: SUP_TANPHAT, unitPrice: 9800, moq: 5000, leadTimeDays: 6, submittedAt: t('2025-08-13T10:00'), status: 'awarded' }),
  makeQuote({ id: 'qt-072-2', code: 'QT-2025-0299', rfqId: 'rfq-2025-072', supplierId: SUP_TIENDAT, unitPrice: 9600, moq: 20000, leadTimeDays: 8, submittedAt: t('2025-08-14T10:00'), status: 'not_selected', buyerFeedback: 'MOQ không phù hợp số lượng đặt' }),
  makeQuote({ id: 'qt-072-3', code: 'QT-2025-0301', rfqId: 'rfq-2025-072', supplierId: 'sup-phucthinh', unitPrice: 10200, moq: 1000, leadTimeDays: 5, submittedAt: t('2025-08-14T15:00'), status: 'not_selected', buyerFeedback: 'Giá cao hơn đối thủ' }),
  makeQuote({ id: 'qt-072-4', code: 'QT-2025-0303', rfqId: 'rfq-2025-072', supplierId: SUP_NAMKHANG, unitPrice: 10500, moq: 2000, leadTimeDays: 3, submittedAt: t('2025-08-15T09:00'), status: 'not_selected', buyerFeedback: 'Giá cao hơn đối thủ' }),
  // RFQ-2025-055 – awarded to Tân Phát
  makeQuote({ id: 'qt-0371', code: 'QT-2025-0171', rfqId: 'rfq-2025-055', supplierId: SUP_TANPHAT, unitPrice: 18500, moq: 1000, leadTimeDays: 8, submittedAt: t('2025-05-21T14:00'), status: 'awarded' }),
  makeQuote({ id: 'qt-055-2', code: 'QT-2025-0172', rfqId: 'rfq-2025-055', supplierId: 'sup-donga', unitPrice: 19200, moq: 2000, leadTimeDays: 10, submittedAt: t('2025-05-22T09:00'), status: 'not_selected', buyerFeedback: 'Lead time dài hơn yêu cầu' }),
];

// ---------------------------------------------------------------------------
// Other buyers' RFQs where Tân Phát is invited (SUP-01 inbox, SUP-03, SUP-06)
// ---------------------------------------------------------------------------

const otherRfqs: Rfq[] = [
  makeRfq({
    id: 'rfq-2025-092',
    code: 'RFQ-2025-092',
    title: '10.000 thùng carton 5 lớp đóng gói bánh kẹo',
    buyerCompanyId: 'buyer-saomai',
    ownerId: 'u-saomai',
    categoryId: 'packaging',
    subcategory: 'Thùng carton',
    productName: 'Thùng carton 5 lớp in 2 màu',
    dimensions: '40 × 30 × 25 cm',
    material: 'Giấy Kraft Thái, sóng BC',
    finishing: 'In Flexo 2 màu',
    quantity: 10000,
    unit: 'thùng',
    deliveryAddress: 'KCN Sóng Thần, Dĩ An, Bình Dương',
    createdAt: t('2025-11-17T13:00'),
    deadline: t('2025-11-22T12:00'),
    neededBy: t('2025-12-10T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_TANPHAT }, { supplierId: SUP_TIENDAT }],
  }),
  makeRfq({
    id: 'rfq-2025-085',
    code: 'RFQ-2025-085',
    title: '20.000 khay carton định hình chống tĩnh điện',
    buyerCompanyId: 'buyer-minhquang',
    ownerId: 'u-minhquang',
    categoryId: 'packaging',
    subcategory: 'Khay giấy',
    productName: 'Khay carton định hình chống tĩnh điện',
    quantity: 20000,
    unit: 'khay',
    deliveryAddress: 'KCN Cao, TP. Thủ Đức, TP.HCM',
    createdAt: t('2025-11-16T10:00'),
    deadline: t('2025-11-21T18:00'),
    neededBy: t('2025-12-08T17:00'),
    lifecycle: 'open',
    terms: { requiredCertifications: ['RoHS'] },
    invited: [{ supplierId: SUP_TANPHAT }, { supplierId: SUP_NAMKHANG }],
  }),
  makeRfq({
    id: 'rfq-2025-096',
    code: 'RFQ-2025-096',
    title: '5.000 hộp thuốc giấy Duplex in offset',
    buyerCompanyId: 'buyer-hoabinh',
    ownerId: 'u-hoabinh',
    categoryId: 'packaging',
    subcategory: 'Hộp giấy',
    productName: 'Hộp thuốc giấy Duplex 300gsm',
    quantity: 5000,
    unit: 'hộp',
    deliveryAddress: 'KCN Tân Tạo, Q. Bình Tân, TP.HCM',
    createdAt: t('2025-11-15T15:00'),
    deadline: t('2025-11-26T17:00'),
    neededBy: t('2025-12-15T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_TANPHAT, viewedAt: t('2025-11-16T09:00') }, { supplierId: 'sup-donga' }],
  }),
  makeRfq({
    id: 'rfq-2025-083',
    code: 'RFQ-2025-083',
    title: '3.000 thùng carton 3 lớp',
    buyerCompanyId: 'buyer-hoabinh',
    ownerId: 'u-hoabinh',
    categoryId: 'packaging',
    subcategory: 'Thùng carton',
    productName: 'Thùng carton 3 lớp đựng thuốc',
    quantity: 3000,
    unit: 'thùng',
    deliveryAddress: 'KCN Tân Tạo, Q. Bình Tân, TP.HCM',
    createdAt: t('2025-11-08T09:00'),
    deadline: t('2025-11-21T17:00'),
    neededBy: t('2025-12-05T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_TANPHAT, viewedAt: t('2025-11-08T14:00') }, { supplierId: 'sup-phucthinh', viewedAt: t('2025-11-09T09:00') }],
  }),
  makeRfq({
    id: 'rfq-2025-080',
    code: 'RFQ-2025-080',
    title: '1.000 hộp cứng quà tặng nam châm',
    buyerCompanyId: 'buyer-elise',
    ownerId: 'u-elise',
    categoryId: 'packaging',
    subcategory: 'Hộp cứng',
    productName: 'Hộp cứng nắp nam châm',
    quantity: 1000,
    unit: 'hộp',
    deliveryAddress: 'Q. Hoàng Mai, Hà Nội',
    createdAt: t('2025-11-01T09:00'),
    deadline: t('2025-11-10T17:00'),
    neededBy: t('2025-11-30T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_TANPHAT, viewedAt: t('2025-11-02T09:00') }],
  }),
  makeRfq({
    id: 'rfq-2025-078',
    code: 'RFQ-2025-078',
    title: '50.000 túi giấy đựng thực phẩm',
    buyerCompanyId: 'buyer-saomai',
    ownerId: 'u-saomai',
    categoryId: 'packaging',
    subcategory: 'Túi giấy',
    productName: 'Túi giấy chống dầu đựng thực phẩm',
    quantity: 50000,
    unit: 'túi',
    deliveryAddress: 'KCN Sóng Thần, Dĩ An, Bình Dương',
    createdAt: t('2025-11-03T09:00'),
    deadline: t('2025-11-12T17:00'),
    neededBy: t('2025-11-28T17:00'),
    lifecycle: 'open',
    invited: [{ supplierId: SUP_TANPHAT, viewedAt: t('2025-11-03T11:00'), declinedAt: t('2025-11-04T09:00') }, { supplierId: SUP_GREENPACK }],
  }),
];

const otherQuotes: Quotation[] = [
  makeQuote({ id: 'qt-0409', code: 'QT-2025-0409', rfqId: 'rfq-2025-083', supplierId: SUP_TANPHAT, unitPrice: 9200, moq: 2000, leadTimeDays: 4, submittedAt: t('2025-11-10T15:30'), status: 'submitted' }),
  makeQuote({ id: 'qt-083-2', code: 'QT-2025-0411', rfqId: 'rfq-2025-083', supplierId: 'sup-phucthinh', unitPrice: 9450, moq: 1000, leadTimeDays: 5, submittedAt: t('2025-11-11T10:00'), status: 'submitted' }),
  makeQuote({ id: 'qt-0415', code: 'QT-2025-0415', rfqId: 'rfq-2025-096', supplierId: SUP_TANPHAT, unitPrice: 6200, moq: 3000, leadTimeDays: 7, submittedAt: t('2025-11-18T08:45'), status: 'draft', offerNotes: 'Đang chờ báo giá giấy Duplex từ nhà cung cấp nguyên liệu.' }),
];

// ---------------------------------------------------------------------------
// Tân Phát bidding history May–Oct 2025 (closed RFQs from other buyers) for SUP-03 / SUP-06
// ---------------------------------------------------------------------------

type HistoryRow = [code: string, buyer: string, title: string, qty: number, unit: string, price: number, lead: number, date: string, outcome: 'awarded' | 'not_selected' | 'withdrawn', feedback?: string];

const history: HistoryRow[] = [
  ['RFQ-2025-068', 'buyer-saomai', '50.000 hộp trà thảo mộc', 50000, 'hộp', 3400, 10, '2025-10-12', 'not_selected', 'Bên mua ưu tiên đơn vị có nhà xưởng gần kho hơn để giao hàng linh hoạt.'],
  ['RFQ-2025-066', 'buyer-minhquang', '8.000 khay giấy chống sốc', 8000, 'khay', 3500, 7, '2025-10-06', 'awarded'],
  ['RFQ-2025-063', 'buyer-hoabinh', '12.000 hộp thuốc Duplex', 12000, 'hộp', 5900, 6, '2025-09-28', 'not_selected', 'Giá cao hơn đối thủ 4,7%'],
  ['RFQ-2025-061', 'buyer-minhlong', '2.000 thùng carton 7 lớp', 2000, 'thùng', 42000, 9, '2025-09-20', 'awarded'],
  ['RFQ-2025-059', 'buyer-saomai', '30.000 thùng carton bánh', 30000, 'thùng', 7600, 8, '2025-09-12', 'not_selected', 'Lead time dài hơn yêu cầu'],
  ['RFQ-2025-049', 'buyer-elise', '8.000 túi Kraft có quai', 8000, 'túi', 5600, 7, '2025-09-02', 'withdrawn'],
  ['RFQ-2025-047', 'buyer-minhquang', '15.000 hộp linh kiện', 15000, 'hộp', 4100, 6, '2025-08-28', 'awarded'],
  ['RFQ-2025-044', 'buyer-hoabinh', '6.000 hộp quà Tết', 6000, 'hộp', 21000, 10, '2025-08-20', 'not_selected', 'Giá cao hơn đối thủ'],
  ['RFQ-2025-041', 'buyer-elise', '5.000 hộp giày', 5000, 'hộp', 12500, 7, '2025-08-05', 'awarded'],
  ['RFQ-2025-038', 'buyer-saomai', '20.000 thùng carton 3 lớp', 20000, 'thùng', 8900, 5, '2025-07-25', 'not_selected', 'MOQ không phù hợp số lượng nhỏ'],
  ['RFQ-2025-035', 'buyer-minhlong', '3.000 thùng gốm sứ', 3000, 'thùng', 26000, 8, '2025-07-15', 'awarded'],
  ['RFQ-2025-031', 'buyer-minhquang', '10.000 khay định hình', 10000, 'khay', 3300, 7, '2025-07-02', 'not_selected', 'Giá cao hơn đối thủ'],
  ['RFQ-2025-027', 'buyer-hoabinh', '4.000 hộp vitamin', 4000, 'hộp', 6800, 6, '2025-06-18', 'not_selected', 'Khác (yêu cầu chứng chỉ GMP)'],
  ['RFQ-2025-023', 'buyer-elise', '2.000 hộp cứng nam châm', 2000, 'hộp', 32000, 12, '2025-06-05', 'awarded'],
  ['RFQ-2025-019', 'buyer-saomai', '40.000 túi giấy', 40000, 'túi', 2100, 6, '2025-05-22', 'not_selected', 'Lead time dài hơn yêu cầu'],
  ['RFQ-2025-016', 'buyer-minhlong', '1.500 thùng carton 5 lớp', 1500, 'thùng', 29500, 7, '2025-05-10', 'not_selected', 'Giá cao hơn đối thủ'],
];

const historyRfqs: Rfq[] = [];
const historyQuotes: Quotation[] = [];
history.forEach(([code, buyer, title, qty, unit, price, lead, date, outcome, feedback], i) => {
  const id = code.toLowerCase();
  const competitor = i % 2 === 0 ? SUP_NAMKHANG : 'sup-phucthinh';
  historyRfqs.push(
    makeRfq({
      id,
      code,
      title,
      buyerCompanyId: buyer,
      ownerId: `u-${buyer.replace('buyer-', '')}`,
      categoryId: 'packaging',
      subcategory: 'Bao bì',
      productName: title.replace(/^[\d.]+\s/, ''),
      quantity: qty,
      unit,
      createdAt: t(`${date}T08:00`),
      deadline: t(`${date}T17:00`),
      neededBy: t(`${date}T17:00`),
      lifecycle: outcome === 'withdrawn' ? 'cancelled' : 'awarded',
      invited: [{ supplierId: SUP_TANPHAT, viewedAt: t(`${date}T09:00`) }, { supplierId: competitor, viewedAt: t(`${date}T09:30`) }],
    }),
  );
  historyQuotes.push(
    makeQuote({
      id: `qt-h${i + 1}`,
      code: `QT-2025-${String(380 - i * 12).padStart(4, '0')}`,
      rfqId: id,
      supplierId: SUP_TANPHAT,
      unitPrice: price,
      moq: Math.min(qty, 2000),
      leadTimeDays: lead,
      submittedAt: t(`${date}T${String(11 + (i % 5)).padStart(2, '0')}:00`),
      status: outcome,
      buyerFeedback: feedback,
    }),
    makeQuote({
      id: `qt-h${i + 1}-c`,
      code: `QT-2025-${String(381 - i * 12).padStart(4, '0')}`,
      rfqId: id,
      supplierId: competitor,
      unitPrice: outcome === 'awarded' ? Math.round(price * 1.06) : Math.round(price * 0.95),
      moq: Math.min(qty, 3000),
      leadTimeDays: lead - 1,
      submittedAt: t(`${date}T15:00`),
      status: outcome === 'awarded' ? 'not_selected' : outcome === 'withdrawn' ? 'submitted' : 'awarded',
    }),
  );
});

export const rfqs: Rfq[] = [...anPhuocRfqs, ...otherRfqs, ...historyRfqs];
export const quotations: Quotation[] = [...anPhuocQuotes, ...otherQuotes, ...historyQuotes];

// Award metadata + timeline events derived from the quotes above.
for (const rfq of rfqs) {
  const quotes = quotations.filter((q) => q.rfqId === rfq.id && q.status !== 'draft');
  for (const q of quotes) rfq.events.push({ id: `${rfq.id}-q-${q.id}`, type: 'quote_received', at: q.submittedAt!, supplierId: q.supplierId });
  const winner = quotes.find((q) => q.status === 'awarded');
  if (winner && rfq.lifecycle === 'awarded') {
    rfq.awardedQuotationId = winner.id;
    rfq.awardedAt = rfq.id === 'rfq-2025-079' ? t('2025-11-18T08:30') : rfq.deadline;
    rfq.events.push({ id: `${rfq.id}-award`, type: 'awarded', at: rfq.awardedAt, supplierId: winner.supplierId });
  }
  if (rfq.lifecycle === 'cancelled') rfq.events.push({ id: `${rfq.id}-cancel`, type: 'cancelled', at: rfq.deadline });
  rfq.events.sort((a, b) => a.at.localeCompare(b.at));
}
