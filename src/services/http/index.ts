import type { Api } from '../contracts';
import { http, setAuthToken } from './client';

type Q = Record<string, string | number | boolean | undefined | string[]>;
const q = (o: object) => o as Q;

/**
 * REST implementation of the service contracts. Endpoints mirror the contract method names so the
 * backend team has a clear target; enable with VITE_API_MODE=http.
 */
export const httpApi: Api = {
  auth: {
    login: async (input) => {
      const session = await http<Awaited<ReturnType<Api['auth']['login']>>>('POST', '/auth/login', { body: input });
      setAuthToken(session.token);
      return session;
    },
    logout: async () => {
      await http('POST', '/auth/logout');
      setAuthToken(null);
    },
    getSession: () => http('GET', '/auth/session'),
    demoAccounts: async () => [],
  },
  settings: {
    get: () => http('GET', '/me/settings'),
    update: (patch) => http('PATCH', '/me/settings', { body: patch }),
  },
  notifications: {
    list: () => http('GET', '/me/notifications'),
    markRead: (id) => http('POST', `/me/notifications/${id}/read`),
    markAllRead: () => http('POST', '/me/notifications/read-all'),
  },
  catalog: {
    categories: () => http('GET', '/catalog/categories'),
  },
  suppliers: {
    search: ({ filters, sort, page, pageSize }) =>
      http('GET', '/suppliers', {
        query: {
          q: filters.query,
          category: filters.categories,
          province: filters.provinces,
          moq: filters.moqBand,
          cert: filters.certifications,
          ownFactory: filters.ownFactoryOnly || undefined,
          export: filters.exportStandardOnly || undefined,
          minRating: filters.minRating || undefined,
          sort,
          page,
          pageSize,
        },
      }),
    get: (id) => http('GET', `/suppliers/${id}`),
    products: (id) => http('GET', `/suppliers/${id}/products`),
    reviews: (id, query) => http('GET', `/suppliers/${id}/reviews`, { query: q(query) }),
    history: (id) => http('GET', `/suppliers/${id}/history`),
  },
  saved: {
    list: () => http('GET', '/buyer/saved-suppliers'),
    save: (supplierId, listId) => http('PUT', `/buyer/saved-suppliers/${supplierId}`, { body: { listId } }),
    unsave: (supplierId) => http('DELETE', `/buyer/saved-suppliers/${supplierId}`),
    createList: (name) => http('POST', '/buyer/saved-supplier-lists', { body: { name } }),
    updateNote: (supplierId, note) => http('PATCH', `/buyer/saved-suppliers/${supplierId}`, { body: { note } }),
  },
  rfqs: {
    dashboard: () => http('GET', '/buyer/dashboard'),
    list: (params) => http('GET', '/buyer/rfqs', { query: q(params) }),
    get: (id) => http('GET', `/buyer/rfqs/${id}`),
    createDraft: (input) => http('POST', '/buyer/rfqs', { body: input ?? {} }),
    updateDraft: (id, patch) => http('PATCH', `/buyer/rfqs/${id}`, { body: patch }),
    send: (id) => http('POST', `/buyer/rfqs/${id}/send`),
    cancel: (id) => http('POST', `/buyer/rfqs/${id}/cancel`),
    duplicate: (id) => http('POST', `/buyer/rfqs/${id}/duplicate`),
    comparison: (id) => http('GET', `/buyer/rfqs/${id}/comparison`),
    award: (id, quotationId) => http('POST', `/buyer/rfqs/${id}/award`, { body: { quotationId } }),
    rejectQuotation: (rfqId, quotationId, reason) =>
      http('POST', `/buyer/rfqs/${rfqId}/quotations/${quotationId}/reject`, { body: { reason } }),
    compareOverview: () => http('GET', '/buyer/comparisons'),
  },
  portal: {
    inbox: (params) => http('GET', '/supplier/inbox', { query: q(params) }),
    rfq: (rfqId) => http('GET', `/supplier/rfqs/${rfqId}`),
    saveQuotationDraft: (rfqId, values) => http('PUT', `/supplier/rfqs/${rfqId}/quotation/draft`, { body: values }),
    submitQuotation: (rfqId, values) => http('POST', `/supplier/rfqs/${rfqId}/quotation`, { body: values }),
    withdrawQuotation: (id) => http('POST', `/supplier/quotations/${id}/withdraw`),
    declineRfq: (rfqId) => http('POST', `/supplier/rfqs/${rfqId}/decline`),
    quotations: (params) => http('GET', '/supplier/quotations', { query: q(params) }),
    quotation: (id) => http('GET', `/supplier/quotations/${id}`),
    performance: () => http('GET', '/supplier/performance'),
    profile: () => http('GET', '/supplier/profile'),
    updateProfile: (patch) => http('PATCH', '/supplier/profile', { body: patch }),
    products: () => http('GET', '/supplier/products'),
    saveProduct: (p) => (p.id ? http('PUT', `/supplier/products/${p.id}`, { body: p }) : http('POST', '/supplier/products', { body: p })),
    deleteProduct: (id) => http('DELETE', `/supplier/products/${id}`),
    saveProductionLine: (l) =>
      l.id ? http('PUT', `/supplier/production-lines/${l.id}`, { body: l }) : http('POST', '/supplier/production-lines', { body: l }),
    deleteProductionLine: (id) => http('DELETE', `/supplier/production-lines/${id}`),
    addCertificate: (input) => http('POST', '/supplier/certificates', { body: input }),
    saveContact: (c) => (c.id ? http('PUT', `/supplier/contacts/${c.id}`, { body: c }) : http('POST', '/supplier/contacts', { body: c })),
    deleteContact: (id) => http('DELETE', `/supplier/contacts/${id}`),
  },
};
