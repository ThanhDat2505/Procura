import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import type { FactoryPhoto, Supplier } from '@/domain/types';
import { factoryImage } from '@/assets/factory';
import { useSupplierProfile } from '@/hooks/supplierPortal';

/** Loads the supplier profile and renders loading / error states around a tab's content. */
export function ProfileGate({ children }: { children: (supplier: Supplier) => ReactNode }) {
  const profile = useSupplierProfile();
  if (profile.isError) {
    return (
      <Card>
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </Card>
    );
  }
  if (!profile.data) return <LoadingState rows={4} />;
  return <>{children(profile.data)}</>;
}

/** Section title with a leading primary icon (cards and bare sections in SUP-05*). */
export function SectionTitle({ icon, children, className, as: Tag = 'h2' }: { icon: string; children: ReactNode; className?: string; as?: 'h2' | 'h3' }) {
  return (
    <Tag className={clsx('flex items-center gap-2 text-headline-sm text-on-surface', className)}>
      <Icon name={icon} className="text-primary" />
      {children}
    </Tag>
  );
}

/** A factory photo tile; `audited` shows the "Đã thẩm định" chip (SUP-05b). */
export function FactoryPhotoTile({ photo, dotClass, showAudited, compact }: { photo: FactoryPhoto; dotClass?: string; showAudited?: boolean; compact?: boolean }) {
  const { t } = useTranslation('profile');
  return (
    <figure className="group relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <div className={clsx('relative w-full overflow-hidden', compact ? 'aspect-[4/3]' : 'h-44')}>
        <img src={factoryImage(photo.imageKey)} alt={photo.caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
        {showAudited && photo.audited && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-success-border bg-surface-container-lowest/90 px-2 py-0.5 text-[10px] font-semibold text-success backdrop-blur-sm">
            <Icon name="verified" filled size={12} />
            {t('photos.audited')}
          </span>
        )}
      </div>
      <figcaption className={clsx('flex-1 bg-surface-container-lowest', compact ? 'p-2.5' : 'p-3')}>
        <span className="flex items-center gap-1.5 text-label-md text-on-surface">
          {dotClass && <span className={clsx('inline-block h-2 w-2 shrink-0 rounded-full', dotClass)} aria-hidden />}
          <span className="truncate">{photo.caption}</span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-on-surface-variant">{photo.subcaption}</span>
      </figcaption>
    </figure>
  );
}

/** Toasts an API error using its `code` (an i18n key under `common:errors`). */
export function useErrorToast() {
  const { t } = useTranslation();
  const toast = useToast();
  return (err: unknown) => {
    const code = (err as { code?: string } | null)?.code;
    toast(code ? t(code, { defaultValue: t('errors.generic') }) : t('errors.generic'), 'error');
  };
}

/** "Sửa | Xóa" text actions used in the profile tables. */
export function RowActions({ onEdit, onDelete, name, separator = '|' }: { onEdit: () => void; onDelete: () => void; name: string; separator?: string }) {
  const { t } = useTranslation('profile');
  return (
    <span className="inline-flex items-center justify-end gap-2 text-label-md text-on-surface-variant">
      <button type="button" className="rounded px-0.5 text-primary hover:underline" onClick={onEdit} aria-label={t('common:actions.edit') + ': ' + name}>
        {t('common:actions.editShort')}
      </button>
      <span className="text-outline-variant" aria-hidden>
        {separator}
      </span>
      <button type="button" className="rounded px-0.5 text-danger hover:underline" onClick={onDelete} aria-label={t('common:actions.delete') + ': ' + name}>
        {t('common:actions.delete')}
      </button>
    </span>
  );
}

