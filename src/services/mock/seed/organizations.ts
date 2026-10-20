import type { BuyerCompany, User } from '@/domain/types';

export const BUYER_ANPHUOC = 'buyer-anphuoc';

export const buyerCompanies: BuyerCompany[] = [
  {
    id: BUYER_ANPHUOC,
    name: 'Công ty TNHH An Phước Logistics',
    shortName: 'An Phước Logistics',
    initials: 'AP',
    taxCode: '0314892019',
    address: 'Tổng kho An Phước, Đường số 9, KCN Cát Lái 2, P. Thạnh Mỹ Lợi, TP. Thủ Đức, TP.HCM',
  },
  {
    id: 'buyer-saomai',
    name: 'Công ty CP Thực phẩm Sao Mai',
    shortName: 'Thực phẩm Sao Mai',
    initials: 'SM',
    taxCode: '0302556781',
    address: 'KCN Sóng Thần, Dĩ An, Bình Dương',
  },
  {
    id: 'buyer-minhquang',
    name: 'Công ty TNHH Điện tử Minh Quang',
    shortName: 'Điện tử Minh Quang',
    initials: 'MQ',
    taxCode: '0315667120',
    address: 'Khu Công nghệ cao, TP. Thủ Đức, TP.HCM',
  },
  {
    id: 'buyer-hoabinh',
    name: 'Công ty CP Dược phẩm Hòa Bình',
    shortName: 'Dược phẩm Hòa Bình',
    initials: 'HB',
    taxCode: '0301889034',
    address: 'KCN Tân Tạo, Q. Bình Tân, TP.HCM',
  },
  {
    id: 'buyer-elise',
    name: 'Công ty TNHH Thời trang Elise',
    shortName: 'Thời trang Elise',
    initials: 'TE',
    taxCode: '0108776512',
    address: 'Q. Hoàng Mai, Hà Nội',
  },
  {
    id: 'buyer-minhlong',
    name: 'Công ty TNHH Gốm sứ Minh Long',
    shortName: 'Gốm sứ Minh Long',
    initials: 'GM',
    taxCode: '3700312456',
    address: 'Thuận An, Bình Dương',
  },
];

/** Demo accounts shown on AUTH-01. Password for both: 123456. */
export const users: User[] = [
  {
    id: 'u-hoang',
    name: 'Trần Nhật Hoàng',
    initials: 'NH',
    title: 'Trưởng phòng Mua hàng',
    email: 'hoang.tn@anphuoc.vn',
    phone: '(+84) 028 3829 4155',
    role: 'buyer',
    organizationId: BUYER_ANPHUOC,
  },
  {
    id: 'u-quan',
    name: 'Trần Đình Quân',
    initials: 'TQ',
    title: 'Quản lý dự án B2B',
    email: 'quan.td@tanphatpack.vn',
    phone: '0918.425.888',
    role: 'supplier',
    organizationId: 'sup-tanphat',
  },
  // Colleagues and buyer contacts (not demo logins, but shown as RFQ owners / contacts).
  { id: 'u-bao', name: 'Lê Quốc Bảo', initials: 'QB', title: 'Chuyên viên Mua hàng', email: 'bao.lq@anphuoc.vn', role: 'buyer', organizationId: BUYER_ANPHUOC },
  { id: 'u-saomai', name: 'Nguyễn Thị Hạnh', initials: 'TH', title: 'Trưởng phòng Thu mua', email: 'hanh.nt@saomaifood.vn', role: 'buyer', organizationId: 'buyer-saomai' },
  { id: 'u-minhquang', name: 'Phạm Quốc Minh', initials: 'QM', title: 'Chuyên viên Sourcing', email: 'minh.pq@minhquang.vn', role: 'buyer', organizationId: 'buyer-minhquang' },
  { id: 'u-hoabinh', name: 'Đặng Thu Hà', initials: 'TH', title: 'Trưởng nhóm Mua hàng', email: 'ha.dt@duochoabinh.vn', role: 'buyer', organizationId: 'buyer-hoabinh' },
  { id: 'u-elise', name: 'Lý Ngọc Mai', initials: 'NM', title: 'Quản lý Chuỗi cung ứng', email: 'mai.ln@elise.vn', role: 'buyer', organizationId: 'buyer-elise' },
  { id: 'u-minhlong', name: 'Trịnh Văn Sơn', initials: 'VS', title: 'Trưởng phòng Vật tư', email: 'son.tv@gomsuminhlong.vn', role: 'buyer', organizationId: 'buyer-minhlong' },
];

/** Accounts that can sign in from AUTH-01. */
export const DEMO_ACCOUNT_IDS = ['u-hoang', 'u-quan'];

export const DEMO_PASSWORD = '123456';
