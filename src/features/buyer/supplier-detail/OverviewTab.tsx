import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LoadingState,
  Skeleton,
  Table,
  Td,
  Th,
  THead,
  Tr,
  buttonClasses,
  useToast,
} from '@/components/ui';
import { factoryImage } from '@/assets/factory';
import type { Supplier } from '@/domain/types';
import { useSupplier, useSupplierHistory, useSupplierProducts } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { CertTile, detailPath, formatScore, newRfqWithProduct, newRfqWithSupplier, useCatalogFormat, useSupplierId } from './shared';
import { latestQuotedRow, maskPhone, monthYear, primaryContact, telHref } from './supplierDetail';

/** BUY-03 — "Tổng quan năng lực". */
export default function OverviewTab() {
  const supplierId = useSupplierId();
  const supplier = useSupplier(supplierId);
  if (supplier.isPending) return <LoadingState />;
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />;
  const s = supplier.data;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <CapabilityCard supplier={s} />
          <ProductsPreview supplierId={s.id} />
          <PhotosCard supplier={s} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          <RepresentativeCard supplier={s} />
          <InteractionCard supplierId={s.id} />
          <CertificatesCard supplier={s} />
        </div>
      </div>
      <ActionBar supplierId={s.id} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Left column
// ---------------------------------------------------------------------------

function CapabilityCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const corrugating = s.productionLines.filter((l) => l.kind === 'corrugating').length;
  const printing = s.productionLines.filter((l) => l.kind === 'printing').length;
  const lineMix = s.productionLines.length > 0 ? t('overview.capability.lineMix', { corrugating, printing }) : s.materials.flutes.join(', ');
  const stats = [
    { label: t('overview.capability.lines'), value: t('overview.capability.linesValue', { count: s.capability.lineCount }), hint: lineMix, accent: false },
    { label: t('overview.capability.capacity'), value: t('overview.capability.capacityValue', { value: f.number(s.capability.monthlyCapacity) }), hint: t('overview.capability.capacityHint'), accent: true },
    { label: t('overview.capability.area'), value: t('overview.capability.areaValue', { value: f.number(s.capability.factoryAreaM2) }), hint: t('overview.capability.areaHint', { location: s.locationLabel }), accent: false },
  ];
  return (
    <Card padding="lg">
      <CardHeader
        divider={false}
        className="mb-3"
        icon="factory"
        title={t('overview.capability.title')}
        actions={
          s.hasOwnFactory && (
            <span className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-0.5 text-label-sm text-on-surface-variant">{t('overview.capability.ownFactory')}</span>
          )
        }
      />
      <p className="mb-4 text-body-lg leading-relaxed text-on-surface-variant">{s.description}</p>
      <dl className="grid grid-cols-1 gap-4 border-t border-outline-variant pt-4 sm:grid-cols-3">
        {stats.map((st) => (
          <div key={st.label} className="flex flex-col rounded-lg bg-surface-container-low p-3.5">
            <dt className="mb-1 text-label-sm uppercase tracking-wide text-outline">{st.label}</dt>
            <dd className={st.accent ? 'text-headline-md font-bold tabular-nums text-primary' : 'text-headline-md font-bold tabular-nums text-on-surface'}>{st.value}</dd>
            <dd className="mt-0.5 text-body-sm text-on-surface-variant">{st.hint}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ProductsPreview({ supplierId }: { supplierId: string }) {
  const { t } = useTranslation('supplierDetail');
  const { f, priceRange, leadTime } = useCatalogFormat();
  const products = useSupplierProducts(supplierId);
  const top = products.data?.slice(0, 3) ?? [];

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant p-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon name="layers" className="mt-0.5 text-primary" />
          <div className="min-w-0">
            <h2 className="text-headline-sm text-on-surface">{t('overview.products.title')}</h2>
            <p className="mt-0.5 text-body-sm text-outline">{t('overview.products.subtitle')}</p>
          </div>
        </div>
        <Link to={detailPath(supplierId, 'products')} className="inline-flex items-center gap-1 text-label-md text-primary hover:underline">
          {t('overview.products.viewAll')}
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
      {products.isPending ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : top.length === 0 ? (
        <EmptyState icon="inventory_2" title={t('products.empty')} />
      ) : (
        <Table minWidth={640}>
          <THead>
            <tr>
              <Th>{t('products.cols.name')}</Th>
              <Th>{t('products.cols.moq')}</Th>
              <Th>{t('products.cols.price')}</Th>
              <Th>{t('overview.products.leadTime')}</Th>
              <Th className="text-right">{t('common:labels.actions')}</Th>
            </tr>
          </THead>
          <tbody>
            {top.map((p) => (
              <Tr key={p.id}>
                <Td className="min-w-[200px]">
                  <div className="font-semibold text-on-surface">{p.name}</div>
                  <div className="text-body-sm text-outline">{p.spec}</div>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="font-semibold text-on-surface">{f.number(p.moq)}</span> <span className="text-body-sm text-outline">{p.unit}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="block font-bold text-primary">{priceRange(p.priceMin, p.priceMax)}</span>
                  <span className="block text-body-sm text-outline">/ {p.unit}</span>
                </Td>
                <Td className="whitespace-nowrap text-on-surface">{leadTime(p.leadTimeMinDays, p.leadTimeMaxDays)}</Td>
                <Td className="text-right">
                  <ButtonLink
                    to={newRfqWithProduct(p.id)}
                    size="xs"
                    variant="ghost"
                    leftIcon="add"
                    className="bg-surface-container text-primary hover:bg-surface-container-high hover:text-primary"
                  >
                    {t('addToRfq')}
                  </ButtonLink>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function PhotosCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const photos = s.photos.slice(0, 3);
  return (
    <Card padding="lg">
      <CardHeader
        divider={false}
        icon="photo_library"
        title={t('overview.photos.title')}
        subtitle={s.audit ? t('overview.photos.subtitle', { year: new Date(s.audit.date).getFullYear() }) : undefined}
        actions={
          s.audit && (
            <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-1 text-label-sm text-outline">
              <Icon name="check_circle" size={14} />
              {t('overview.photos.audited', { date: monthYear(s.audit.date) })}
            </span>
          )
        }
      />
      {photos.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('overview.photos.empty')}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="group overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
              <div className="h-44 overflow-hidden">
                <img src={factoryImage(p.imageKey)} alt={p.caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="border-t border-outline-variant bg-surface-container-lowest p-2.5">
                <p className="truncate text-label-md text-on-surface" title={p.caption}>
                  {p.caption}
                </p>
                <p className="text-body-sm text-outline">{p.subcaption}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column
// ---------------------------------------------------------------------------

function SideCardHeader({ icon, title, aside }: { icon: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-outline-variant pb-3">
      <h2 className="flex items-center gap-2 text-headline-sm text-on-surface">
        <Icon name={icon} className="text-primary" />
        {title}
      </h2>
      {aside}
    </div>
  );
}

function RepresentativeCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const toast = useToast();
  const [showPhone, setShowPhone] = useState(false);
  const contact = primaryContact(s.contacts);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast(t('common:toast.copied'));
    } catch {
      toast(t('common:errors.generic'), 'error');
    }
  };

  return (
    <Card padding="md">
      <SideCardHeader
        icon="badge"
        title={t('overview.rep.title')}
        aside={
          <span className="h-2.5 w-2.5 rounded-full bg-success ring-4 ring-success-container" title={t('overview.rep.online')}>
            <span className="sr-only">{t('overview.rep.online')}</span>
          </span>
        }
      />
      {!contact ? (
        <p className="text-body-md text-on-surface-variant">{t('header.noContact')}</p>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-label-lg font-bold text-primary" aria-hidden>
              {contact.initials}
            </span>
            <div className="min-w-0">
              <p className="text-body-lg font-bold text-on-surface">{contact.name}</p>
              <p className="text-label-sm text-primary">{contact.title}</p>
              <p className="mt-0.5 text-body-sm text-outline">{contact.responsibility}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5 text-body-sm">
            <li className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2">
              <a href={`mailto:${contact.email}`} className="flex min-w-0 items-center gap-2 font-medium text-on-surface hover:text-primary">
                <Icon name="mail" size={18} className="text-outline" />
                <span className="truncate">{contact.email}</span>
              </a>
              <IconButton icon="content_copy" size={16} label={t('overview.rep.copyEmail')} className="text-primary" onClick={() => void copyEmail(contact.email)} />
            </li>
            <li className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2">
              <span className="flex items-center gap-2 font-medium tabular-nums text-on-surface">
                <Icon name="call" size={18} className="text-outline" />
                {showPhone ? (
                  <a href={telHref(contact.phone)} className="hover:text-primary">
                    {contact.phone}
                  </a>
                ) : (
                  maskPhone(contact.phone)
                )}
              </span>
              {!showPhone && (
                <button type="button" className="rounded px-1 text-label-sm text-primary hover:underline" onClick={() => setShowPhone(true)}>
                  {t('overview.rep.showPhone')}
                </button>
              )}
            </li>
            <li className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2 text-on-surface-variant">
              <Icon name="schedule" size={18} className="text-outline" />
              {t('overview.rep.hours', { hours: s.workingHours })}
            </li>
          </ul>
          <div className="mt-4 flex gap-2 border-t border-outline-variant pt-3">
            <a href={`mailto:${contact.email}`} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'flex-1' })}>
              <Icon name="mail" size={18} />
              {t('overview.rep.email')}
            </a>
            <a href={telHref(contact.phone)} className={buttonClasses({ variant: 'primary', size: 'sm', className: 'flex-1' })}>
              <Icon name="call" size={18} />
              {t('overview.rep.call')}
            </a>
          </div>
        </>
      )}
    </Card>
  );
}

function InteractionCard({ supplierId }: { supplierId: string }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const history = useSupplierHistory(supplierId);
  const latest = history.data ? latestQuotedRow(history.data.rows) : undefined;
  const rating = history.data?.internalRating;

  return (
    <Card padding="md">
      <SideCardHeader icon="manage_history" title={t('overview.interaction.title')} aside={<span className="text-label-sm text-outline">{t('overview.interaction.yourCompany')}</span>} />
      {history.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} className="py-4" />
      ) : history.data.rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('overview.interaction.none')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <span className="flex shrink-0 rounded bg-surface-container p-2 text-primary">
              <Icon name="task_alt" />
            </span>
            <div className="min-w-0">
              <p className="text-label-md text-on-surface">{t('overview.interaction.completed', { count: history.data.stats.awarded })}</p>
              <p className="mt-0.5 text-body-sm text-outline">{t('overview.interaction.invited', { count: history.data.stats.invited })}</p>
            </div>
          </div>
          {latest && (
            <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <span className="flex shrink-0 rounded bg-surface-container p-2 text-secondary">
                <Icon name="receipt_long" />
              </span>
              <div className="min-w-0">
                <p className="text-label-md text-on-surface">{t('overview.interaction.latest', { when: f.relative(latest.invitedAt) })}</p>
                <p className="mt-0.5 text-body-sm text-outline">
                  {t('overview.interaction.latestFor')}{' '}
                  <Link to={`/buyer/rfqs/${latest.rfqId}`} className="text-primary hover:underline">
                    {latest.code}
                  </Link>{' '}
                  ({latest.title})
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-outline bg-surface-container-lowest p-3">
            <span className="text-body-sm text-outline">{t('overview.interaction.internalRating')}</span>
            {rating ? (
              <span className="inline-flex items-center gap-1 text-label-md font-bold text-warning">
                <Icon name="star" filled size={16} />
                {formatScore(rating.score)} / 5.0
              </span>
            ) : (
              <span className="text-body-sm text-on-surface-variant">{t('overview.interaction.notRated')}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function CertificatesCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const certs = s.certificates.filter((c) => c.status === 'verified');
  return (
    <Card padding="md">
      <SideCardHeader icon="workspace_premium" title={t('overview.certs.title')} aside={certs.length > 0 && <span className="text-label-sm text-primary">{t('overview.certs.checked')}</span>} />
      {certs.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('overview.certs.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {certs.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-lg bg-surface-container-low p-3">
              <CertTile code={c.code} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-label-md text-on-surface">{c.name}</span>
                  <Icon name="check_circle" filled size={16} className="text-primary" label={t('overview.certs.verified')} />
                </div>
                <p className="text-body-sm text-outline">{c.description}</p>
                <span className="mt-1 block text-[10px] text-outline">{t('overview.certs.validTo', { date: monthYear(c.validTo) })}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sticky action bar
// ---------------------------------------------------------------------------

function ActionBar({ supplierId }: { supplierId: string }) {
  const { t } = useTranslation('supplierDetail');
  return (
    <aside
      aria-label={t('overview.bar.label')}
      className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest/95 px-4 py-3 shadow-level-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border"
    >
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
          <Icon name="shopping_cart_checkout" />
        </span>
        <div className="min-w-0">
          <p className="text-label-md text-on-surface">{t('overview.bar.title')}</p>
          <p className="text-body-sm text-outline">{t('overview.bar.subtitle')}</p>
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
        <Button variant="secondary" leftIcon="download" className="hidden sm:inline-flex" onClick={() => window.print()}>
          {t('overview.bar.profilePdf')}
        </Button>
        <ButtonLink to={newRfqWithSupplier(supplierId)} leftIcon="post_add" className="flex-1 md:flex-none">
          {t('overview.bar.addToRfq')}
        </ButtonLink>
      </div>
    </aside>
  );
}


