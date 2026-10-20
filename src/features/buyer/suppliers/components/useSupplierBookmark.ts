import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import type { ID } from '@/domain/types';
import { useSavedSupplierIds, useToggleSavedSupplier } from '@/hooks/buyer';

/** Bookmark state + toggle with feedback toasts, shared by BUY-01 and BUY-02 supplier cards. */
export function useSupplierBookmark() {
  const { t } = useTranslation('discovery');
  const toast = useToast();
  const savedIds = useSavedSupplierIds();
  const mutation = useToggleSavedSupplier();

  const toggle = (supplierId: ID, name: string) => {
    const save = !savedIds.has(supplierId);
    mutation.mutate(
      { supplierId, save },
      {
        onSuccess: () => toast(t(save ? 'toast.saved' : 'toast.unsaved', { name }), 'success'),
        onError: () => toast(t('common:errors.generic'), 'error'),
      },
    );
  };

  const isPending = (supplierId: ID) => mutation.isPending && mutation.variables?.supplierId === supplierId;

  return { isSaved: (id: ID) => savedIds.has(id), toggle, isPending };
}
