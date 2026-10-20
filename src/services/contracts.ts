/**
 * Service contracts used by the UI. Two implementations exist:
 *  - `services/mock`  in-browser backend over a seeded, localStorage-persisted dataset (default)
 *  - `services/http`  REST client skeleton for the future Procura API (VITE_API_MODE=http)
 * Components never import an implementation directly; they go through hooks in `src/hooks`.
 */
import type {
  AppNotification,
  BuyerCompany,
  Category,
  Certificate,
  ID,
  Page,
  Product,
  ProductionLine,
  Quotation,
  ReviewCriteria,
  ReviewSummary,
  Rfq,
  RfqDisplayStatus,
  RfqTerms,
  Role,
  SavedSupplier,
  SavedSupplierList,
  Session,
  Supplier,
  SupplierContact,
  SupplierReview,
  SupplierSummary,
  User,
} from '@/domain/types';
import type { SupplierPerformance } from '@/domain/performance';
import type { SupplierFilters, SupplierSort } from '@/domain/supplierSearch';
import type { QuotationFormValues } from '@/domain/quotation';

// ---------------------------------------------------------------------------
// Auth & settings
// ---------------------------------------------------------------------------

export interface LoginInput {
  email: string;
  password: string;
  role: Role;
  remember: boolean;
}

export interface DemoAccount {
  role: Role;
  email: string;
  password: string;
}

export interface AuthApi {
  login(input: LoginInput): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
  demoAccounts(): Promise<DemoAccount[]>;
}

export interface UserSettings {
  language: 'vi' | 'en';
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd';
  numberFormat: 'vi' | 'en';
  timezone: 'Asia/Ho_Chi_Minh';
  notifications: { newQuoteEmail: boolean; deadlineReminder: boolean; weeklyDigest: boolean };
}

export interface SettingsApi {
  get(): Promise<UserSettings>;
  update(patch: Partial<UserSettings>): Promise<UserSettings>;
}

export interface NotificationApi {
  list(): Promise<AppNotification[]>;
  markRead(id: ID): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface CatalogApi {
  categories(): Promise<Category[]>;
}

// ---------------------------------------------------------------------------
// Buyer: suppliers
// ---------------------------------------------------------------------------

export interface SupplierSearchParams {
  filters: SupplierFilters;
  sort: SupplierSort;
  page: number;
  pageSize: number;
}

export interface FacetCount<K extends string = string> {
  key: K;
  count: number;
}

export interface SupplierSearchResult extends Page<SupplierSummary> {
  facets: {
    categories: FacetCount[];
    provinces: FacetCount[];
  };
}

export interface ReviewQuery {
  rating?: number;
  withText?: boolean;
  sameCategory?: boolean;
  sort: 'newest' | 'highest' | 'lowest';
  page: number;
  pageSize: number;
}

export interface ReviewsResult {
  summary: ReviewSummary;
  page: Page<SupplierReview>;
  /** RFQs awarded to this supplier by the current buyer that have not been reviewed yet. */
  pendingReviewRfqs: { rfqId: ID; code: string; title: string }[];
}

export type HistoryOutcome = 'awarded' | 'not_selected' | 'pending' | 'no_response';

export interface SupplierHistoryRow {
  rfqId: ID;
  code: string;
  title: string;
  invitedAt: string;
  unitPrice?: number;
  unit: string;
  moq?: number;
  leadTimeDays?: number;
  outcome: HistoryOutcome;
  note?: string;
}

export interface InternalRating {
  score: number;
  criteria: ReviewCriteria;
  note: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SupplierHistory {
  stats: { invited: number; quoted: number; awarded: number; avgResponseHours: number };
  rows: SupplierHistoryRow[];
  internalRating: InternalRating | null;
}

export interface SupplierApi {
  search(params: SupplierSearchParams): Promise<SupplierSearchResult>;
  get(id: ID): Promise<Supplier>;
  products(id: ID): Promise<Product[]>;
  reviews(id: ID, query: ReviewQuery): Promise<ReviewsResult>;
  history(id: ID): Promise<SupplierHistory>;
}

export interface SavedSupplierItem extends SavedSupplier {
  supplier: SupplierSummary;
  lastInteraction?: { label: string; at: string };
}

export interface SavedSuppliersResult {
  lists: (SavedSupplierList & { count: number })[];
  items: SavedSupplierItem[];
}

export interface SavedSupplierApi {
  list(): Promise<SavedSuppliersResult>;
  save(supplierId: ID, listId?: ID): Promise<void>;
  unsave(supplierId: ID): Promise<void>;
  createList(name: string): Promise<SavedSupplierList>;
  updateNote(supplierId: ID, note: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Buyer: RFQs, quotations, comparison
// ---------------------------------------------------------------------------

export type RfqStatusTab = 'all' | RfqDisplayStatus;

export interface RfqListParams {
  tab: RfqStatusTab;
  query?: string;
  categoryId?: string;
  ownerId?: ID;
  deadlineWithinDays?: number;
  page: number;
  pageSize: number;
}

export interface RfqListItem {
  rfq: Rfq;
  status: RfqDisplayStatus;
  quoteCount: number;
  invitedCount: number;
  owner: Pick<User, 'id' | 'name' | 'initials'>;
  lowestUnitPrice?: number;
}

export interface RfqListResult extends Page<RfqListItem> {
  counts: Record<RfqStatusTab, number>;
  stats: { open: number; awaitingDecision: number; dueSoon: number; awardedThisMonth: number };
  owners: Pick<User, 'id' | 'name'>[];
}

export interface InvitationView {
  supplier: SupplierSummary;
  sentAt: string;
  viewedAt?: string;
  declinedAt?: string;
  quotation?: Quotation;
}

export interface RfqDetail {
  rfq: Rfq;
  status: RfqDisplayStatus;
  owner: User;
  invitations: InvitationView[];
  quotations: (Quotation & { supplier: SupplierSummary })[];
}

/** Fields the wizard can change on a draft. */
export type RfqDraftPatch = Partial<
  Pick<
    Rfq,
    | 'title'
    | 'categoryId'
    | 'subcategory'
    | 'productName'
    | 'dimensions'
    | 'material'
    | 'finishing'
    | 'quantity'
    | 'unit'
    | 'attachments'
    | 'deliveryAddress'
    | 'deadline'
    | 'neededBy'
    | 'budgetMin'
    | 'budgetMax'
    | 'completedStep'
  >
> & { terms?: Partial<RfqTerms>; supplierIds?: ID[] };

export interface ComparisonData {
  rfq: Rfq;
  quotations: Quotation[];
  suppliers: Supplier[];
}

export interface BuyerDashboard {
  greetingName: string;
  stats: {
    activeRfqs: number;
    activeRfqsDueSoon: number;
    quotesToReview: number;
    quotesNewToday: number;
    savingsRate: number;
    savingsAmount: number;
    avgResponseRate: number;
    avgResponseHours: number;
  };
  recentRfqs: RfqListItem[];
  recentQuotes: { quotation: Quotation; supplier: SupplierSummary; rfqCode: string; rfqId: ID; unit: string }[];
  featuredSuppliers: SupplierSummary[];
}

export interface CompareOverviewCard {
  item: RfqListItem;
  lowestUnitPrice?: { value: number; supplierName: string };
  fastestLeadTime?: { days: number; supplierName: string };
  awardedSupplierName?: string;
  awardedUnitPrice?: number;
  savingsRate?: number;
}

export interface CompareOverview {
  stats: { ready: number; waiting: number; awarded: number; negotiatedBudget: number };
  ready: CompareOverviewCard[];
  waiting: CompareOverviewCard[];
  awarded: CompareOverviewCard[];
}

export interface BuyerRfqApi {
  dashboard(): Promise<BuyerDashboard>;
  list(params: RfqListParams): Promise<RfqListResult>;
  get(id: ID): Promise<RfqDetail>;
  createDraft(input?: { supplierIds?: ID[]; productId?: ID }): Promise<Rfq>;
  updateDraft(id: ID, patch: RfqDraftPatch): Promise<Rfq>;
  send(id: ID): Promise<Rfq>;
  cancel(id: ID): Promise<Rfq>;
  duplicate(id: ID): Promise<Rfq>;
  comparison(id: ID): Promise<ComparisonData>;
  /** Marks the winning quotation; all other active quotes become "not selected". No order is created. */
  award(id: ID, quotationId: ID): Promise<Rfq>;
  rejectQuotation(rfqId: ID, quotationId: ID, reason?: string): Promise<void>;
  compareOverview(): Promise<CompareOverview>;
}

// ---------------------------------------------------------------------------
// Supplier portal
// ---------------------------------------------------------------------------

export type InboxTab = 'new' | 'drafting' | 'submitted' | 'closed';

export interface InboxItem {
  rfq: Rfq;
  buyer: BuyerCompany;
  tab: InboxTab;
  quotation?: Quotation;
  declined: boolean;
  expired: boolean;
}

export interface InboxResult {
  items: InboxItem[];
  counts: Record<InboxTab, number>;
  stats: { newThisWeek: number; drafting: number; dueSoon: number; responseRate: number };
}

export interface SupplierRfqView {
  rfq: Rfq;
  buyer: BuyerCompany;
  buyerContact: Pick<User, 'name' | 'initials' | 'title' | 'email' | 'phone'>;
  quotation?: Quotation;
  /** Market reference range shown under the unit price field. */
  priceHint?: { min: number; max: number };
  declined: boolean;
}

export type QuotationTab = 'all' | 'pending' | 'awarded' | 'not_selected' | 'closed';

export interface SupplierQuotationItem {
  quotation: Quotation;
  rfq: Rfq;
  buyer: BuyerCompany;
  total: number;
}

export interface SupplierQuotationsResult extends Page<SupplierQuotationItem> {
  counts: Record<QuotationTab, number>;
  stats: { submitted: number; pending: number; awarded: number; notSelected: number; submittedLast30Days: number };
}

export interface SupplierQuotationDetail extends SupplierRfqView {
  quotation: Quotation;
}

export interface PerformanceRecentResult {
  rfq: Rfq;
  buyer: BuyerCompany;
  quotation: Quotation;
  priceRank: { rank: number; of: number };
}

export interface SupplierPerformanceView extends SupplierPerformance {
  recent: PerformanceRecentResult[];
}

export interface NewCertificateInput {
  name: string;
  issuer: string;
  number: string;
  validTo: string;
  fileName: string;
}

export interface SupplierPortalApi {
  inbox(params: { tab: InboxTab; query?: string; sort: 'deadline' | 'newest' }): Promise<InboxResult>;
  rfq(rfqId: ID): Promise<SupplierRfqView>;
  saveQuotationDraft(rfqId: ID, values: Partial<QuotationFormValues>): Promise<Quotation>;
  submitQuotation(rfqId: ID, values: QuotationFormValues): Promise<Quotation>;
  withdrawQuotation(quotationId: ID): Promise<Quotation>;
  declineRfq(rfqId: ID): Promise<void>;
  quotations(params: { tab: QuotationTab; page: number; pageSize: number }): Promise<SupplierQuotationsResult>;
  quotation(id: ID): Promise<SupplierQuotationDetail>;
  performance(): Promise<SupplierPerformanceView>;
  profile(): Promise<Supplier>;
  updateProfile(patch: Partial<Pick<Supplier, 'description' | 'capability' | 'materials' | 'samplePolicy' | 'workingHours' | 'responseSla' | 'website' | 'employeesLabel' | 'foundedYear'>>): Promise<Supplier>;
  products(): Promise<Product[]>;
  saveProduct(product: Omit<Product, 'id' | 'supplierId'> & { id?: ID }): Promise<Product>;
  deleteProduct(id: ID): Promise<void>;
  saveProductionLine(line: Omit<ProductionLine, 'id'> & { id?: ID }): Promise<ProductionLine>;
  deleteProductionLine(id: ID): Promise<void>;
  addCertificate(input: NewCertificateInput): Promise<Certificate>;
  saveContact(contact: Omit<SupplierContact, 'id' | 'initials'> & { id?: ID }): Promise<SupplierContact>;
  deleteContact(id: ID): Promise<void>;
}

export interface Api {
  auth: AuthApi;
  settings: SettingsApi;
  notifications: NotificationApi;
  catalog: CatalogApi;
  suppliers: SupplierApi;
  saved: SavedSupplierApi;
  rfqs: BuyerRfqApi;
  portal: SupplierPortalApi;
}

/** Error shape shared by both implementations; `code` is an i18n key under `common:errors`. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
    public readonly status = 400,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}
