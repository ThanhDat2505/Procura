import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import {
  Badge,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  Icon,
  LoadingState,
  Popover,
  Skeleton,
  TabLinks,
  useToast,
} from '@/components/ui';
import type { Supplier } from '@/domain/types';
import { useSavedSupplierIds, useSupplier, useSupplierHistory, useSupplierProducts, useToggleSavedSupplier } from '@/hooks/buyer';
import { detailPath, formatScore, newRfqWithSupplier, useSupplierId } from './shared';
import { primaryContact, telHref } from './supplierDetail';

/** BUY-03 shell: breadcrumb, supplier header card, route tabs and the active tab. */
export default function SupplierDetailLayout() {
  const { t } = useTranslation('supplierDetail');
  const supplierId = useSupplierId();
  const supplier = useSupplier(supplierId);
  const products = useSupplierProducts(supplierId);
  const history = useSupplierHistory(supplierId);

  const crumbs = [{ label: t('breadcrumb.search'), to: '/buyer/suppliers' }, { label: t('breadcrumb.detail') }];

  if (supplier.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <Card padding="lg" className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-1/2 max-w-sm" />
          </div>
        </Card>
        <LoadingState rows={3} />
      </div>
    );
  }

  if (supplier.isError) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <Card>
          <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />
          <div className="flex justify-center pb-6">
            <ButtonLink to="/buyer/suppliers" variant="link" leftIcon="arrow_back">
              {t('backToSearch')}
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const s = supplier.data;
  const base = detailPath(s.id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[...crumbs, { label: s.name }]} />
      <SupplierHeader supplier={s} />
      <TabLinks
        items={[
          { to: base, end: true, label: t('tabs.overview') },
          { to: detailPath(s.id, 'products'), label: t('tabs.products'), count: products.data?.length },
          { to: detailPath(s.id, 'history'), label: t('tabs.history'), count: history.data?.rows.length },
          { to: detailPath(s.id, 'legal'), label: t('tabs.legal') },
          { to: detailPath(s.id, 'reviews'), label: t('tabs.reviews'), count: s.reviewCount },
        ]}
      />
      <Outlet />
    </div>
  );
}

function Dot() {
  return (
    <span className="text-outline-variant" aria-hidden>
      ·
    </span>
  );
}

function SupplierHeader({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const toast = useToast();
  const savedIds = useSavedSupplierIds();
  const toggleSaved = useToggleSavedSupplier();
  const saved = savedIds.has(s.id);

  const onToggleSaved = () => {
    toggleSaved.mutate(
      { supplierId: s.id, save: !saved },
      {
        onSuccess: () => toast(saved ? t('header.unsavedToast', { name: s.shortName }) : t('header.savedToast', { name: s.shortName })),
        onError: () => toast(t('common:errors.generic'), 'error'),
      },
    );
  };

  return (
    <Card as="section" padding="lg" aria-labelledby="supplier-name">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-[34rem] items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high text-headline-md font-bold text-primary" aria-hidden>
            {s.initials ? s.initials : <Icon name="inventory_2" size={32} />}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 id="supplier-name" className="text-headline-lg font-bold tracking-tight text-on-surface">
                {s.name}
              </h1>
              {s.verified && (
                <Badge tone="info" icon="verified">
                  {t('common:labels.verifiedByProcura')}
                </Badge>
              )}
              {s.strategicPartner && (
                <Badge tone="navy" icon="military_tech">
                  {t('header.strategicPartner')}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <Icon name="star" filled size={16} />
                <span className="tabular-nums">{formatScore(s.rating)}</span>
                <span className="font-normal text-on-surface-variant">({t('common:labels.reviews', { count: s.reviewCount })})</span>
              </span>
              <Dot />
              <span className="inline-flex items-center gap-1">
                <Icon name="location_on" size={16} className="text-outline" />
                {s.locationLabel}
              </span>
              <Dot />
              <span>
                {t('header.taxCode')}: <span className="font-medium tabular-nums text-on-surface">{s.legal.taxCode}</span>
              </span>
              <Dot />
              <span>{t('header.founded', { year: s.foundedYear })}</span>
              <Dot />
              <span className="inline-flex items-center gap-1">
                <Icon name="schedule" size={16} className="text-outline" />
                {t('header.avgResponse')}: <strong className="font-semibold text-on-surface">{t('header.underHours', { count: Math.max(1, Math.ceil(s.avgResponseHours)) })}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <ContactPopover supplier={s} />
          <Button
            variant={saved ? 'outline' : 'secondary'}
            onClick={onToggleSaved}
            disabled={toggleSaved.isPending}
            aria-pressed={saved}
          >
            <Icon name="bookmark" filled={saved} size={18} />
            {saved ? t('common:actions.saved_supplier') : t('common:actions.save_supplier')}
          </Button>
          <ButtonLink to={newRfqWithSupplier(s.id)} leftIcon="post_add">
            {t('header.createRfq')}
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

function ContactPopover({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const contact = primaryContact(supplier.contacts);
  return (
    <Popover
      align="right"
      className="w-[min(20rem,calc(100vw-2rem))] p-4"
      trigger={({ open, toggle, id }) => (
        <Button variant="secondary" leftIcon="chat" onClick={toggle} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog">
          {t('header.contact')}
        </Button>
      )}
    >
      {() =>
        contact ? (
          <div className="flex flex-col gap-3" role="dialog" aria-label={t('header.contact')}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container font-bold text-primary" aria-hidden>
                {contact.initials}
              </span>
              <div className="min-w-0">
                <p className="text-label-lg text-on-surface">{contact.name}</p>
                <p className="text-body-sm text-on-surface-variant">{contact.title}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-body-md">
              <li>
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-on-surface hover:bg-surface-container-low hover:text-primary">
                  <Icon name="mail" size={18} className="text-outline" />
                  <span className="truncate">{contact.email}</span>
                </a>
              </li>
              <li>
                <a href={telHref(contact.phone)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 tabular-nums text-on-surface hover:bg-surface-container-low hover:text-primary">
                  <Icon name="call" size={18} className="text-outline" />
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 px-2 py-1.5 text-body-sm text-on-surface-variant">
                <Icon name="schedule" size={18} className="text-outline" />
                {supplier.workingHours}
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">{t('header.noContact')}</p>
        )
      }
    </Popover>
  );
}
