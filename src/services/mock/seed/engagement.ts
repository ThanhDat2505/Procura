import type { AppNotification, ReviewSummary, SavedSupplier, SavedSupplierList, SupplierReview } from '@/domain/types';
import { SUP_GREENPACK, SUP_HUNGTHINH, SUP_NAMKHANG, SUP_TANPHAT, SUP_TIENDAT } from './suppliers';

const t = (local: string) => new Date(`${local}:00+07:00`).toISOString();

// ---------------------------------------------------------------------------
// Saved suppliers (BUY-04): 14 suppliers in 4 lists
// ---------------------------------------------------------------------------

export const savedLists: SavedSupplierList[] = [
  { id: 'list-packaging', name: 'Bao bì & Đóng gói' },
  { id: 'list-office', name: 'Văn phòng phẩm' },
  { id: 'list-furniture', name: 'Nội thất' },
  { id: 'list-chemicals', name: 'Hóa chất & Nhựa' },
];

const save = (supplierId: string, listId: string, note: string, savedAt: string): SavedSupplier => ({ supplierId, listIds: [listId], note, savedAt: t(savedAt) });

export const savedSuppliers: SavedSupplier[] = [
  save(SUP_TANPHAT, 'list-packaging', 'Đối tác trọng điểm mảng bao bì carton', '2025-05-02T09:00'),
  save(SUP_TIENDAT, 'list-packaging', 'Giá tốt cho đơn hàng sản lượng lớn', '2025-06-11T10:00'),
  save(SUP_NAMKHANG, 'list-packaging', 'Giao nhanh, công nợ 15 ngày', '2025-06-20T14:00'),
  save(SUP_GREENPACK, 'list-packaging', 'Ưu tiên cho dòng sản phẩm xanh', '2025-07-01T09:00'),
  save(SUP_HUNGTHINH, 'list-packaging', 'Năng lực sản xuất lớn', '2025-07-15T09:00'),
  save('sup-phucthinh', 'list-packaging', 'Đối thủ cạnh tranh của Tân Phát', '2025-08-02T09:00'),
  save('sup-achau', 'list-office', 'Giao trong ngày nội thành', '2025-03-10T09:00'),
  save('sup-saoviet', 'list-office', 'In logo quà tặng sự kiện', '2025-04-12T09:00'),
  save('sup-donga', 'list-office', 'Tem nhãn mã vạch kho', '2025-04-28T09:00'),
  save('sup-minhlong', 'list-office', '', '2025-09-01T09:00'),
  save('sup-tana', 'list-furniture', 'Đã lắp đặt văn phòng Q.7', '2025-02-20T09:00'),
  save('sup-minhduc', 'list-furniture', '', '2025-10-05T09:00'),
  save('sup-daiphat', 'list-chemicals', 'Màng co PE chất lượng ổn định', '2025-05-18T09:00'),
  save('sup-vietthang', 'list-chemicals', 'Phù hợp kho Hải Phòng', '2025-09-22T09:00'),
];

// ---------------------------------------------------------------------------
// Reviews (BUY-03e)
// ---------------------------------------------------------------------------

export const reviewSummaries: ReviewSummary[] = [
  { supplierId: SUP_TANPHAT, average: 4.9, total: 38, distribution: [31, 6, 1, 0, 0], criteria: { quality: 5.0, onTime: 4.8, price: 4.6, support: 4.9 } },
];

const review = (id: string, buyerName: string, buyerInitials: string, rfqCode: string, rfqTitle: string, date: string, rating: number, criteria: SupplierReview['criteria'], text: string, reply?: string): SupplierReview => ({
  id,
  supplierId: SUP_TANPHAT,
  buyerName,
  buyerInitials,
  rfqCode,
  rfqTitle,
  date: t(`${date}T10:00`),
  rating,
  criteria,
  text,
  reply,
});

export const reviews: SupplierReview[] = [
  review('rv-1', 'Công ty TNHH An Phước Logistics', 'AP', 'RFQ-2025-072', '10.000 thùng carton 3 lớp sóng B', '2025-10-18', 5, { quality: 5, onTime: 5, price: 4.5, support: 5 }, 'Xưởng Tân Phát giao hàng đúng hẹn, chất lượng giấy Kraft Nhật định lượng 140gsm rất cứng cáp, đường cấn bế chuẩn xác. Tỷ lệ lỗi dưới 0,1%, giải quyết khiếu nại rất chuyên nghiệp.', 'Cảm ơn An Phước Logistics đã tin tưởng đồng hành cùng Tân Phát trong các gói thầu bao bì!'),
  review('rv-2', 'Công ty CP Thực phẩm Sao Mai', 'SM', 'RFQ-2025-047', '15.000 hộp bánh trung thu', '2025-10-02', 5, { quality: 5, onTime: 4.5, price: 4.5, support: 5 }, 'Màu in Flexo đúng chuẩn Pantone, hộp đứng form tốt. Đội ngũ tư vấn kỹ thuật hỗ trợ chỉnh sửa khuôn bế rất nhanh.'),
  review('rv-3', 'Công ty TNHH Điện tử Minh Quang', 'MQ', 'RFQ-2025-066', '8.000 khay giấy chống sốc', '2025-09-21', 5, { quality: 5, onTime: 5, price: 4.5, support: 4.5 }, 'Khay định hình đạt yêu cầu chống sốc cho linh kiện, có báo cáo test RoHS đầy đủ.', 'Tân Phát cảm ơn quý khách, hẹn gặp lại ở các đơn hàng tiếp theo.'),
  review('rv-4', 'Công ty CP Dược phẩm Hòa Bình', 'HB', 'RFQ-2025-027', '4.000 hộp vitamin', '2025-08-30', 4, { quality: 5, onTime: 4, price: 4, support: 4.5 }, 'Chất lượng in tốt, tuy nhiên lead time lô đầu chậm 1 ngày so với cam kết.'),
  review('rv-5', 'Công ty TNHH Thời trang Elise', 'TE', 'RFQ-2025-041', '5.000 hộp giày', '2025-08-15', 5, { quality: 5, onTime: 5, price: 4.5, support: 5 }, 'Hộp giày cứng cáp, cán màng mờ đẹp. Mẫu thử gửi trong 48h đúng như cam kết.'),
  review('rv-6', 'Công ty TNHH Gốm sứ Minh Long', 'GM', 'RFQ-2025-035', '3.000 thùng gốm sứ', '2025-07-28', 5, { quality: 5, onTime: 5, price: 4.5, support: 5 }, 'Thùng 5 lớp chịu lực tốt cho hàng gốm sứ dễ vỡ, không có hư hỏng trong vận chuyển.'),
  review('rv-7', 'Công ty CP Thực phẩm Sao Mai', 'SM', 'RFQ-2025-019', '40.000 túi giấy', '2025-06-10', 4, { quality: 4.5, onTime: 4.5, price: 4, support: 4.5 }, 'Túi giấy đạt yêu cầu, giá hơi cao so với mặt bằng chung.'),
  review('rv-8', 'Công ty TNHH Thời trang Elise', 'TE', 'RFQ-2025-023', '2.000 hộp cứng nam châm', '2025-06-25', 5, { quality: 5, onTime: 5, price: 4.5, support: 5 }, 'Hộp cứng nam châm hoàn thiện cao cấp, đúng thiết kế thương hiệu.'),
];

// ---------------------------------------------------------------------------
// Internal ratings by the demo buyer (BUY-03c side card)
// ---------------------------------------------------------------------------

export const internalRatings = [
  {
    supplierId: SUP_TANPHAT,
    buyerCompanyId: 'buyer-anphuoc',
    score: 4.8,
    criteria: { quality: 5.0, onTime: 4.8, price: 4.5, support: 4.9 },
    note: 'Đối tác trọng điểm mảng bao bì carton. Rất uy tín về thời gian giao hàng và bù hao nếu có lỗi sóng.',
    updatedAt: t('2025-11-16T10:00'),
    updatedBy: 'Hoàng.TN',
  },
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications: AppNotification[] = [
  { id: 'n-1', userId: 'u-hoang', kind: 'quote_received', title: 'Bao Bì Tân Phát đã gửi báo giá', body: 'RFQ-2025-089 · 8.500 đ/hộp (Lead time 5 ngày)', at: t('2025-11-17T14:28'), read: false, link: '/buyer/rfqs/rfq-2025-089' },
  { id: 'n-2', userId: 'u-hoang', kind: 'deadline', title: 'RFQ-2025-089 còn 2 ngày đến hạn', body: 'Hạn nhận báo giá 17:00 20/11/2025', at: t('2025-11-18T08:30'), read: false, link: '/buyer/rfqs/rfq-2025-089' },
  { id: 'n-3', userId: 'u-hoang', kind: 'quote_received', title: 'Bao Bì Nam Khang Vina đã gửi báo giá', body: 'RFQ-2025-089 · 8.900 đ/hộp (Lead time 3 ngày)', at: t('2025-11-17T09:15'), read: false, link: '/buyer/rfqs/rfq-2025-089' },
  { id: 'n-4', userId: 'u-hoang', kind: 'rfq_viewed', title: 'Bao Bì Hưng Thịnh đã xem RFQ-2025-089', body: 'Chưa gửi báo giá', at: t('2025-11-17T16:20'), read: true, link: '/buyer/rfqs/rfq-2025-089' },
  { id: 'n-5', userId: 'u-quan', kind: 'rfq_received', title: 'Yêu cầu báo giá mới: RFQ-2025-093', body: 'Công ty TNHH An Phước Logistics · 3.000 hộp carton nắp gài', at: t('2025-11-17T15:30'), read: false, link: '/supplier/inbox/rfq-2025-093' },
  { id: 'n-6', userId: 'u-quan', kind: 'rfq_received', title: 'Yêu cầu báo giá mới: RFQ-2025-092', body: 'Công ty CP Thực phẩm Sao Mai · 10.000 thùng carton 5 lớp', at: t('2025-11-17T13:00'), read: false, link: '/supplier/inbox/rfq-2025-092' },
  { id: 'n-7', userId: 'u-quan', kind: 'rfq_viewed', title: 'An Phước Logistics đã xem báo giá QT-2025-0412', body: 'RFQ-2025-089 · Chờ kết quả', at: t('2025-11-18T08:00'), read: true, link: '/supplier/quotations/qt-0412' },
];
