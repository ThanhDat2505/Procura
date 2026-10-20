import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compareQuotations } from '@/domain/comparison';
import type { ID } from '@/domain/types';
import { api, type RfqDraftPatch, type RfqListParams, type ReviewQuery, type SupplierSearchParams } from '@/services';

/** Query keys for buyer data. Mutations invalidate by prefix. */
export const buyerKeys = {
  dashboard: ['buyer', 'dashboard'] as const,
  suppliers: (p: SupplierSearchParams) => ['buyer', 'suppliers', p] as const,
  supplier: (id: ID) => ['buyer', 'supplier', id] as const,
  supplierProducts: (id: ID) => ['buyer', 'supplier', id, 'products'] as const,
  supplierReviews: (id: ID, q: ReviewQuery) => ['buyer', 'supplier', id, 'reviews', q] as const,
  supplierHistory: (id: ID) => ['buyer', 'supplier', id, 'history'] as const,
  saved: ['buyer', 'saved'] as const,
  rfqs: (p: RfqListParams) => ['buyer', 'rfqs', p] as const,
  rfq: (id: ID) => ['buyer', 'rfq', id] as const,
  comparison: (id: ID) => ['buyer', 'rfq', id, 'comparison'] as const,
  compareOverview: ['buyer', 'compare-overview'] as const,
};

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export const useSupplierSearch = (params: SupplierSearchParams) =>
  useQuery({ queryKey: buyerKeys.suppliers(params), queryFn: () => api.suppliers.search(params), placeholderData: keepPreviousData });

export const useSupplier = (id: ID) => useQuery({ queryKey: buyerKeys.supplier(id), queryFn: () => api.suppliers.get(id) });

export const useSupplierProducts = (id: ID) => useQuery({ queryKey: buyerKeys.supplierProducts(id), queryFn: () => api.suppliers.products(id) });

export const useSupplierReviews = (id: ID, query: ReviewQuery) =>
  useQuery({ queryKey: buyerKeys.supplierReviews(id, query), queryFn: () => api.suppliers.reviews(id, query), placeholderData: keepPreviousData });

export const useSupplierHistory = (id: ID) => useQuery({ queryKey: buyerKeys.supplierHistory(id), queryFn: () => api.suppliers.history(id) });

// ---------------------------------------------------------------------------
// Saved suppliers
// ---------------------------------------------------------------------------

export const useSavedSuppliers = () => useQuery({ queryKey: buyerKeys.saved, queryFn: () => api.saved.list() });

/** Set of saved supplier ids, for bookmark toggles anywhere in the buyer app. */
export function useSavedSupplierIds(): Set<ID> {
  const { data } = useSavedSuppliers();
  return new Set(data?.items.map((i) => i.supplierId) ?? []);
}

export function useToggleSavedSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, save }: { supplierId: ID; save: boolean }) => (save ? api.saved.save(supplierId) : api.saved.unsave(supplierId)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: buyerKeys.saved });
      void qc.invalidateQueries({ queryKey: buyerKeys.dashboard });
    },
  });
}

export function useCreateSavedList() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (name: string) => api.saved.createList(name), onSuccess: () => qc.invalidateQueries({ queryKey: buyerKeys.saved }) });
}

export function useUpdateSavedNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, note }: { supplierId: ID; note: string }) => api.saved.updateNote(supplierId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: buyerKeys.saved }),
  });
}

// ---------------------------------------------------------------------------
// RFQs
// ---------------------------------------------------------------------------

export const useBuyerDashboard = () => useQuery({ queryKey: buyerKeys.dashboard, queryFn: () => api.rfqs.dashboard() });

export const useRfqList = (params: RfqListParams) =>
  useQuery({ queryKey: buyerKeys.rfqs(params), queryFn: () => api.rfqs.list(params), placeholderData: keepPreviousData });

export const useRfq = (id: ID) => useQuery({ queryKey: buyerKeys.rfq(id), queryFn: () => api.rfqs.get(id) });

export const useCompareOverview = () => useQuery({ queryKey: buyerKeys.compareOverview, queryFn: () => api.rfqs.compareOverview() });

/** BUY-08 data plus the derived comparison (weights from the RFQ). */
export function useComparison(id: ID) {
  return useQuery({
    queryKey: buyerKeys.comparison(id),
    queryFn: () => api.rfqs.comparison(id),
    select: (data) => ({ ...data, result: compareQuotations(data.rfq, data.quotations, data.suppliers) }),
  });
}

function useInvalidateRfqs() {
  const qc = useQueryClient();
  return (id?: ID) => {
    void qc.invalidateQueries({ queryKey: ['buyer', 'rfqs'] });
    void qc.invalidateQueries({ queryKey: buyerKeys.dashboard });
    void qc.invalidateQueries({ queryKey: buyerKeys.compareOverview });
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (id) void qc.invalidateQueries({ queryKey: buyerKeys.rfq(id) });
  };
}

export function useCreateRfqDraft() {
  const invalidate = useInvalidateRfqs();
  return useMutation({ mutationFn: (input?: { supplierIds?: ID[]; productId?: ID }) => api.rfqs.createDraft(input), onSuccess: () => invalidate() });
}

export function useUpdateRfqDraft(id: ID) {
  const qc = useQueryClient();
  const invalidate = useInvalidateRfqs();
  return useMutation({
    mutationFn: (patch: RfqDraftPatch) => api.rfqs.updateDraft(id, patch),
    onSuccess: (rfq) => {
      // Keep the detail cache in sync without a refetch so the wizard feels instant.
      qc.setQueryData(buyerKeys.rfq(id), (prev: Awaited<ReturnType<typeof api.rfqs.get>> | undefined) => (prev ? { ...prev, rfq } : prev));
      invalidate(id);
    },
  });
}

export function useSendRfq() {
  const invalidate = useInvalidateRfqs();
  return useMutation({ mutationFn: (id: ID) => api.rfqs.send(id), onSuccess: (rfq) => invalidate(rfq.id) });
}

export function useCancelRfq() {
  const invalidate = useInvalidateRfqs();
  return useMutation({ mutationFn: (id: ID) => api.rfqs.cancel(id), onSuccess: (rfq) => invalidate(rfq.id) });
}

export function useDuplicateRfq() {
  const invalidate = useInvalidateRfqs();
  return useMutation({ mutationFn: (id: ID) => api.rfqs.duplicate(id), onSuccess: () => invalidate() });
}

export function useAwardQuotation(rfqId: ID) {
  const qc = useQueryClient();
  const invalidate = useInvalidateRfqs();
  return useMutation({
    mutationFn: (quotationId: ID) => api.rfqs.award(rfqId, quotationId),
    onSuccess: () => {
      invalidate(rfqId);
      void qc.invalidateQueries({ queryKey: buyerKeys.comparison(rfqId) });
    },
  });
}

export function useRejectQuotation(rfqId: ID) {
  const qc = useQueryClient();
  const invalidate = useInvalidateRfqs();
  return useMutation({
    mutationFn: ({ quotationId, reason }: { quotationId: ID; reason?: string }) => api.rfqs.rejectQuotation(rfqId, quotationId, reason),
    onSuccess: () => {
      invalidate(rfqId);
      void qc.invalidateQueries({ queryKey: buyerKeys.comparison(rfqId) });
    },
  });
}
