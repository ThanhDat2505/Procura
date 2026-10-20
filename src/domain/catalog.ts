import type { Category, CategoryId, Province } from './types';

/** Reference data. Labels are i18n keys in the `common` namespace. */
export const CATEGORIES: Category[] = [
  { id: 'packaging', labelKey: 'categories.packaging', subcategories: ['Hộp carton', 'Thùng carton', 'Hộp cứng', 'Hộp giấy', 'Túi giấy', 'Túi nhựa', 'Khay giấy', 'Vật tư tiêu hao', 'Bao bì'] },
  { id: 'office-supplies', labelKey: 'categories.office-supplies', subcategories: ['Văn phòng phẩm', 'Giấy in', 'In ấn tài liệu'] },
  { id: 'office-equipment', labelKey: 'categories.office-equipment', subcategories: ['Máy in & thiết bị', 'Thiết bị trình chiếu'] },
  { id: 'industrial', labelKey: 'categories.industrial', subcategories: ['Pallet', 'Thiết bị kho', 'Vật tư công nghiệp'] },
  { id: 'apparel', labelKey: 'categories.apparel', subcategories: ['Đồng phục BHLĐ', 'Đồng phục văn phòng'] },
  { id: 'furniture', labelKey: 'categories.furniture', subcategories: ['Bàn ghế văn phòng', 'Tủ hồ sơ', 'Vách ngăn'] },
  { id: 'chemicals', labelKey: 'categories.chemicals', subcategories: ['Màng PE', 'Hạt nhựa', 'Hóa chất công nghiệp'] },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export const PROVINCES: Province[] = ['hcm', 'binh-duong', 'ha-noi', 'dong-nai', 'long-an', 'hai-phong'];

export const UNITS = ['hộp', 'cái', 'thùng', 'bộ', 'túi', 'cuộn', 'khay', 'tấm', 'kg', 'tấn'] as const;

export const CERTIFICATION_OPTIONS = ['ISO 9001', 'FSC', 'ISO 14001', 'RoHS', 'REACH', 'BRC', 'TCVN bao bì thực phẩm'] as const;

export const PAYMENT_TERM_OPTIONS = [
  'Tạm ứng 50%, thanh toán 50% còn lại khi nhận đủ hàng',
  'Thanh toán trong vòng 30 ngày (Net 30) sau khi nhận đủ hàng & hóa đơn VAT',
  'Thanh toán công nợ 15 ngày sau khi giao hàng',
  'Tạm ứng 30%, thanh toán 70% còn lại sau khi giao hàng đủ',
  'Tạm ứng 100% trước khi sản xuất',
] as const;
