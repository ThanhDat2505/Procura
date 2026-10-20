import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { Badge, Button, buttonClasses, Card, ErrorState, Icon, PageHeader, ProgressBar, Skeleton, TabLinks, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import type { Supplier } from '@/domain/types';
import { useMyProducts, useSupplierProfile } from '@/hooks/supplierPortal';
import { ProfileSaveProvider, useProfileSaveHandle } from './ProfileSaveContext';
import { completenessHint, completenessLevel, verifiedCertificates, type CompletenessHint } from './profileHelpers';

const BASE = '/supplier/profile';

export default function ProfileLayout() {
  return (
    <ProfileSaveProvider>
      <ProfileLayoutInner />
    </ProfileSaveProvider>
  );
}

function ProfileLayoutInner() {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const profile = useSupplierProfile();
  const products = useMyProducts();
  const handle = useProfileSaveHandle();
  const supplier = profile.data;

  return (
    <>
      <PageHeader
        title={t('layout.title')}
        badge={
          <Badge tone="success" icon="check_circle">
            {t('layout.published')}
          </Badge>
        }
        subtitle={t('layout.subtitle')}
        actions={
          <>
            <Button variant="secondary" leftIcon="visibility" onClick={() => toast(t('common:states.notSupported'), 'info')}>
              {t('layout.viewAsBuyer')}
            </Button>
            <Button leftIcon="save" disabled={!handle?.dirty} loading={handle?.saving} onClick={() => void handle?.save()} title={handle?.dirty ? undefined : t('layout.nothingToSave')}>
              {t('common:actions.saveChanges')}
            </Button>
          </>
        }
      />

      {profile.isError ? (
        <Card>
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        </Card>
      ) : (
        <>
          {supplier ? <CompletenessCard supplier={supplier} /> : <Skeleton className="mb-6 h-20 w-full rounded-xl" />}

          <TabLinks
            className="mb-6 xl:[&>a]:px-2.5 [&>a]:text-label-md"
            items={[
              { to: BASE, end: true, label: t('tabs.general'), icon: 'storefront' },
              { to: `${BASE}/capacity`, label: t('tabs.capacity'), icon: 'precision_manufacturing' },
              {
                to: `${BASE}/products`,
                icon: 'inventory_2',
                label: products.data ? <TabLabel text={t('tabs.products')} chip={t('tabs.skuCount', { count: products.data.length })} /> : t('tabs.products'),
              },
              {
                to: `${BASE}/legal`,
                icon: 'verified',
                label: supplier ? (
                  <TabLabel text={t('tabs.legal')} chip={t('tabs.docCount', { count: verifiedCertificates(supplier.certificates).length })} success />
                ) : (
                  t('tabs.legal')
                ),
              },
              { to: `${BASE}/contacts`, label: t('tabs.contacts'), icon: 'contact_phone' },
            ]}
          />

          <Outlet />
        </>
      )}
    </>
  );
}

function TabLabel({ text, chip, success }: { text: string; chip: string; success?: boolean }) {
  return (
    <>
      {text}
      <span className={success ? 'rounded-full bg-success-container px-1.5 py-0.5 text-label-sm text-success' : 'rounded-full bg-surface-container-high px-1.5 py-0.5 text-label-sm text-on-surface-variant'}>
        {chip}
      </span>
    </>
  );
}

function CompletenessRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden>
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-surface-container-high" />
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct}, 100`} className="text-primary" />
      </svg>
      <span className="absolute text-label-md tabular-nums text-on-surface">{pct}%</span>
    </div>
  );
}

function CompletenessCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const value = supplier.profileCompleteness;
  const pct = Math.round(value * 100);
  const hint = completenessHint(supplier, clock.now());

  return (
    <Card padding="sm" className="mb-6 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <CompletenessRing value={value} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-label-lg text-on-surface">{t('layout.completeness', { pct })}</span>
            <span className="text-body-sm text-on-surface-variant">{t(`layout.level.${completenessLevel(value)}`)}</span>
          </div>
          <ProgressBar value={value} label={t('layout.completeness', { pct })} />
          <p className="mt-1.5 text-body-sm text-on-surface-variant">{t('layout.completenessNote')}</p>
        </div>
      </div>
      <HintBox hint={hint} />
    </Card>
  );
}

function HintBox({ hint }: { hint: CompletenessHint }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const meta: Record<CompletenessHint['kind'], { icon: string; to?: string; action?: string }> = {
    photos: { icon: 'add_photo_alternate', action: t('layout.hintAction.photos') },
    pendingCertificate: { icon: 'pending_actions', to: `${BASE}/legal`, action: t('layout.hintAction.pendingCertificate') },
    expiringCertificate: { icon: 'warning', to: `${BASE}/legal`, action: t('layout.hintAction.expiringCertificate') },
    contacts: { icon: 'group_add', to: `${BASE}/contacts`, action: t('layout.hintAction.contacts') },
    website: { icon: 'language', to: `${BASE}/contacts`, action: t('layout.hintAction.website') },
    description: { icon: 'edit_note', to: BASE, action: t('layout.hintAction.description') },
    complete: { icon: 'verified' },
  };
  const m = meta[hint.kind];
  const text =
    hint.kind === 'photos'
      ? t('layout.hint.photos', { count: hint.missing })
      : hint.kind === 'pendingCertificate'
        ? t('layout.hint.pendingCertificate', { name: hint.name })
        : hint.kind === 'expiringCertificate'
          ? t('layout.hint.expiringCertificate', { name: hint.name, count: hint.daysLeft })
          : t(`layout.hint.${hint.kind}`);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary-fixed-dim/60 bg-primary-fixed/40 px-3 py-2 md:max-w-[52%]">
      <Icon name={m.icon} size={20} className="text-primary" />
      <span className="flex-1 text-body-sm text-on-surface">{text}</span>
      {m.action &&
        (m.to ? (
          <Link to={m.to} className={buttonClasses({ variant: 'link', className: 'shrink-0' })}>
            {m.action}
          </Link>
        ) : (
          <Button variant="link" className="shrink-0" onClick={() => toast(t('common:states.notSupported'), 'info')}>
            {m.action}
          </Button>
        ))}
    </div>
  );
}
