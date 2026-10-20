import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuotationFormValues } from '@/domain/quotation';
import type { ID } from '@/domain/types';
import { api, type InboxTab, type NewCertificateInput, type QuotationTab, type SupplierPortalApi } from '@/services';

export const portalKeys = {
  all: ['portal'] as const,
  inbox: (p: { tab: InboxTab; query?: string; sort: 'deadline' | 'newest' }) => ['portal', 'inbox', p] as const,
  rfq: (id: ID) => ['portal', 'rfq', id] as const,
  quotations: (p: { tab: QuotationTab; page: number; pageSize: number }) => ['portal', 'quotations', p] as const,
  quotation: (id: ID) => ['portal', 'quotation', id] as const,
  performance: ['portal', 'performance'] as const,
  profile: ['portal', 'profile'] as const,
  products: ['portal', 'products'] as const,
};

export const useInbox = (params: { tab: InboxTab; query?: string; sort: 'deadline' | 'newest' }) =>
  useQuery({ queryKey: portalKeys.inbox(params), queryFn: () => api.portal.inbox(params), placeholderData: keepPreviousData });

export const usePortalRfq = (id: ID) => useQuery({ queryKey: portalKeys.rfq(id), queryFn: () => api.portal.rfq(id) });

export const useMyQuotations = (params: { tab: QuotationTab; page: number; pageSize: number }) =>
  useQuery({ queryKey: portalKeys.quotations(params), queryFn: () => api.portal.quotations(params), placeholderData: keepPreviousData });

export const useMyQuotation = (id: ID) => useQuery({ queryKey: portalKeys.quotation(id), queryFn: () => api.portal.quotation(id) });

export const usePerformance = () => useQuery({ queryKey: portalKeys.performance, queryFn: () => api.portal.performance() });

export const useSupplierProfile = (enabled = true) => useQuery({ queryKey: portalKeys.profile, queryFn: () => api.portal.profile(), enabled });

export const useMyProducts = () => useQuery({ queryKey: portalKeys.products, queryFn: () => api.portal.products() });

/** Any portal mutation refreshes all portal data plus notifications (counts in the sidebar). */
function usePortalMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.all });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const useSaveQuotationDraft = (rfqId: ID) => usePortalMutation((values: Partial<QuotationFormValues>) => api.portal.saveQuotationDraft(rfqId, values));
export const useSubmitQuotation = (rfqId: ID) => usePortalMutation((values: QuotationFormValues) => api.portal.submitQuotation(rfqId, values));
export const useWithdrawQuotation = () => usePortalMutation((id: ID) => api.portal.withdrawQuotation(id));
export const useDeclineRfq = () => usePortalMutation((rfqId: ID) => api.portal.declineRfq(rfqId));
export const useUpdateProfile = () => usePortalMutation((patch: Parameters<SupplierPortalApi['updateProfile']>[0]) => api.portal.updateProfile(patch));
export const useSaveProduct = () => usePortalMutation((p: Parameters<SupplierPortalApi['saveProduct']>[0]) => api.portal.saveProduct(p));
export const useDeleteProduct = () => usePortalMutation((id: ID) => api.portal.deleteProduct(id));
export const useSaveProductionLine = () => usePortalMutation((l: Parameters<SupplierPortalApi['saveProductionLine']>[0]) => api.portal.saveProductionLine(l));
export const useDeleteProductionLine = () => usePortalMutation((id: ID) => api.portal.deleteProductionLine(id));
export const useAddCertificate = () => usePortalMutation((input: NewCertificateInput) => api.portal.addCertificate(input));
export const useSaveContact = () => usePortalMutation((c: Parameters<SupplierPortalApi['saveContact']>[0]) => api.portal.saveContact(c));
export const useDeleteContact = () => usePortalMutation((id: ID) => api.portal.deleteContact(id));
