/**
 * Core domain model shared by the mock backend, the future HTTP client and the UI.
 * Dates are ISO-8601 strings so the shapes can be sent over JSON unchanged.
 */

export type ID = string;
export type ISODate = string;

export type Role = 'buyer' | 'supplier';

export interface User {
  id: ID;
  name: string;
  initials: string;
  title: string;
  email: string;
  phone?: string;
  role: Role;
  /** Buyer company id or supplier id, depending on role. */
  organizationId: ID;
}

export interface Session {
  user: User;
  token: string;
}

export interface BuyerCompany {
  id: ID;
  name: string;
  shortName: string;
  initials: string;
  taxCode: string;
  address: string;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export type CategoryId =
  | 'packaging'
  | 'office-supplies'
  | 'office-equipment'
  | 'industrial'
  | 'apparel'
  | 'furniture'
  | 'chemicals';

export interface Category {
  id: CategoryId;
  /** i18n key under `common:categories`. */
  labelKey: string;
  subcategories: string[];
}

export type Province = 'hcm' | 'binh-duong' | 'ha-noi' | 'dong-nai' | 'hai-phong' | 'long-an';

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export type VerificationStatus = 'verified' | 'pending';

export interface Certificate {
  id: ID;
  /** Short code shown on chips, e.g. "ISO 9001". */
  code: string;
  name: string;
  description: string;
  issuer: string;
  number: string;
  validFrom: ISODate;
  validTo: ISODate;
  status: VerificationStatus;
  submittedAt?: ISODate;
}

export interface Product {
  id: ID;
  supplierId: ID;
  name: string;
  spec: string;
  sku: string;
  group: string;
  moq: number;
  unit: string;
  priceMin: number;
  priceMax: number;
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  certifications: string[];
  visibleToBuyers: boolean;
}

export type ProductionLineStatus = 'active' | 'maintenance';

export interface ProductionLine {
  id: ID;
  name: string;
  kind: 'corrugating' | 'printing';
  equipmentType: string;
  capacity: string;
  yearInstalled: number;
  status: ProductionLineStatus;
}

export interface SupplierContact {
  id: ID;
  name: string;
  initials: string;
  title: string;
  email: string;
  phone: string;
  responsibility: string;
  notifyNewRfq: boolean;
  isPrimary: boolean;
  visibleToBuyers: boolean;
}

export interface FactoryPhoto {
  id: ID;
  /** Key into the asset registry (see `src/assets/factory`). */
  imageKey: string;
  caption: string;
  subcaption: string;
  audited: boolean;
}

export interface SupplierLegalInfo {
  legalName: string;
  englishName: string;
  taxCode: string;
  businessLicense: string;
  licenseIssuedAt: ISODate;
  licenseIssuer: string;
  legalRepresentative: string;
  registeredCapital: number;
  registeredAddress: string;
  mainBusiness: string;
  verifiedAt: ISODate;
}

export interface SupplierAudit {
  date: ISODate;
  auditor: string;
  result: 'passed' | 'failed';
  score: number;
  summary: string;
}

export interface SupplierCapability {
  factoryAreaM2: number;
  monthlyCapacity: number;
  capacityUnit: string;
  lineCount: number;
  technicalStaff: number;
}

export interface SamplePolicy {
  defaultMoq: number;
  sampleLeadTimeHours: number;
  freeSample: boolean;
  freeSampleMinOrder: number;
  standardLeadTimeMinDays: number;
  standardLeadTimeMaxDays: number;
}

export interface Supplier {
  id: ID;
  name: string;
  shortName: string;
  initials: string;
  province: Province;
  locationLabel: string;
  verified: boolean;
  strategicPartner: boolean;
  rating: number;
  reviewCount: number;
  categories: CategoryId[];
  /** Chips shown under "Dòng sản phẩm chủ lực". */
  highlightProducts: string[];
  /** Short tagline, e.g. "Hơn 12 năm KN • Xưởng 5.000m²". */
  tagline: string;
  description: string;
  moq: number;
  moqUnit: string;
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  certifications: string[];
  hasOwnFactory: boolean;
  exportStandard: boolean;
  foundedYear: number;
  employeesLabel: string;
  responseRate: number;
  avgResponseHours: number;
  completedRfqCount: number;
  capability: SupplierCapability;
  productionLines: ProductionLine[];
  materials: { flutes: string[]; papers: string[]; finishing: string[] };
  samplePolicy: SamplePolicy;
  photos: FactoryPhoto[];
  contacts: SupplierContact[];
  certificates: Certificate[];
  legal: SupplierLegalInfo;
  audit?: SupplierAudit;
  workingHours: string;
  responseSla: string;
  website?: string;
  profileCompleteness: number;
}

export type SupplierSummary = Pick<
  Supplier,
  | 'id'
  | 'name'
  | 'shortName'
  | 'initials'
  | 'province'
  | 'locationLabel'
  | 'verified'
  | 'rating'
  | 'reviewCount'
  | 'categories'
  | 'highlightProducts'
  | 'tagline'
  | 'moq'
  | 'moqUnit'
  | 'leadTimeMinDays'
  | 'leadTimeMaxDays'
  | 'certifications'
  | 'hasOwnFactory'
  | 'exportStandard'
  | 'completedRfqCount'
>;

export interface SupplierReview {
  id: ID;
  supplierId: ID;
  buyerName: string;
  buyerInitials: string;
  rfqCode: string;
  rfqTitle: string;
  date: ISODate;
  rating: number;
  criteria: ReviewCriteria;
  text: string;
  reply?: string;
}

export interface ReviewCriteria {
  quality: number;
  onTime: number;
  price: number;
  support: number;
}

export interface ReviewSummary {
  supplierId: ID;
  average: number;
  total: number;
  /** Index 0 = 5 stars … index 4 = 1 star. */
  distribution: [number, number, number, number, number];
  criteria: ReviewCriteria;
}

export interface SavedSupplier {
  supplierId: ID;
  listIds: ID[];
  note: string;
  savedAt: ISODate;
}

export interface SavedSupplierList {
  id: ID;
  name: string;
}

// ---------------------------------------------------------------------------
// RFQs
// ---------------------------------------------------------------------------

/** Persisted lifecycle state. Display states are derived in `domain/rfq.ts`. */
export type RfqLifecycle = 'draft' | 'open' | 'awarded' | 'cancelled';

/** What badges, tabs and filters show. */
export type RfqDisplayStatus = 'draft' | 'open' | 'awaiting' | 'quoted' | 'awarded' | 'expired' | 'cancelled';

export interface Attachment {
  id: ID;
  name: string;
  sizeBytes: number;
  description?: string;
}

export interface EvaluationWeights {
  price: number;
  leadTime: number;
  moq: number;
  quality: number;
}

export interface RfqTerms {
  vatIncluded: boolean;
  currency: 'VND';
  paymentTerms: string;
  minValidityDays: number;
  sampleRequired: boolean;
  sampleQuantity: number;
  sampleNote: string;
  requiredCertifications: string[];
  weights: EvaluationWeights;
  notesToSuppliers: string;
}

export interface RfqInvitation {
  supplierId: ID;
  sentAt: ISODate;
  viewedAt?: ISODate;
  declinedAt?: ISODate;
}

export type RfqEventType = 'created' | 'sent' | 'viewed' | 'quote_received' | 'all_quotes_received' | 'awarded' | 'cancelled';

export interface RfqEvent {
  id: ID;
  type: RfqEventType;
  at: ISODate;
  supplierId?: ID;
  note?: string;
}

export type RfqPriority = 'normal' | 'high';

export interface Rfq {
  id: ID;
  code: string;
  title: string;
  buyerCompanyId: ID;
  ownerId: ID;
  categoryId: CategoryId;
  subcategory: string;
  productName: string;
  dimensions: string;
  material: string;
  finishing: string;
  quantity: number;
  unit: string;
  attachments: Attachment[];
  deliveryAddress: string;
  /** Quote submission deadline. */
  deadline: ISODate;
  neededBy: ISODate;
  priority: RfqPriority;
  priorityNote?: string;
  buyerNote?: string;
  budgetMin?: number;
  budgetMax?: number;
  terms: RfqTerms;
  invitations: RfqInvitation[];
  lifecycle: RfqLifecycle;
  awardedQuotationId?: ID;
  awardedAt?: ISODate;
  events: RfqEvent[];
  createdAt: ISODate;
  updatedAt: ISODate;
  sentAt?: ISODate;
  /** Highest wizard step the buyer has completed (0–4). */
  completedStep: number;
}

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export type QuotationStatus = 'draft' | 'submitted' | 'viewed' | 'awarded' | 'not_selected' | 'withdrawn' | 'expired';

export interface Quotation {
  id: ID;
  code: string;
  rfqId: ID;
  supplierId: ID;
  unitPrice: number;
  moq: number;
  leadTimeDays: number;
  validityDays: number;
  paymentTerms: string;
  samplePolicy: string;
  toolingCost: number;
  toolingNote?: string;
  offerNotes: string;
  technicalNotes?: string;
  vatIncluded: boolean;
  certifications: string[];
  attachments: Attachment[];
  status: QuotationStatus;
  createdAt: ISODate;
  submittedAt?: ISODate;
  updatedAt: ISODate;
  viewedAt?: ISODate;
  decidedAt?: ISODate;
  /** Buyer feedback shown to the supplier when not selected. */
  buyerFeedback?: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationKind = 'quote_received' | 'deadline' | 'rfq_viewed' | 'rfq_received' | 'awarded' | 'not_selected';

export interface AppNotification {
  id: ID;
  userId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  at: ISODate;
  read: boolean;
  link?: string;
}

// ---------------------------------------------------------------------------
// Shared query shapes
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
