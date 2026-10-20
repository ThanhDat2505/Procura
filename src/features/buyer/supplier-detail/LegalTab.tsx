import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Callout, Card, CardHeader, EmptyState, ErrorState, Icon, IconButton, LoadingState, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import { vndToWords } from '@/domain/quotation';
import type { Certificate, Supplier, SupplierAudit } from '@/domain/types';
import { useSupplier } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { CertTile, useSupplierId } from './shared';
import { certificateValidity, monthYear, type CertificateValidity } from './supplierDetail';

/** BUY-03d — "Hồ sơ pháp lý & Chứng chỉ". */
export default function LegalTab() {
  const { t } = useTranslation('supplierDetail');
  const supplierId = useSupplierId();
  const supplier = useSupplier(supplierId);

  if (supplier.isPending) return <LoadingState />;
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />;
  const s = supplier.data;
  const certs = s.certificates.filter((c) => c.status === 'verified');

  return (
    <section className="flex flex-col gap-6" aria-label={t('tabs.legal')}>
      {s.verified ? (
        <div className="flex flex-col gap-3 rounded-xl border border-success-border bg-success-container p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 md:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <Icon name="verified_user" filled size={24} />
            </span>
            <div>
              <p className="text-headline-sm leading-tight text-[#14532D]">{t('legal.banner.title')}</p>
              <p className="mt-0.5 text-body-sm text-[#166534]">{t('legal.banner.subtitle', { date: monthYear(s.legal.verifiedAt) })}</p>
            </div>
          </div>
          <span className="self-start whitespace-nowrap rounded-full bg-success px-3 py-1 text-label-sm uppercase tracking-wide text-white md:self-auto">{t('legal.banner.pill')}</span>
        </div>
      ) : (
        <Callout tone="warning" title={t('legal.pending.title')}>
          {t('legal.pending.body')}
        </Callout>
      )}

      <LegalInfoCard supplier={s} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2.5 text-headline-sm font-bold text-on-surface">
            <Icon name="verified" className="text-primary" size={22} />
            {t('legal.certs.title')}
          </h2>
          <span className="text-body-sm text-on-surface-variant">{t('legal.certs.count', { count: certs.length })}</span>
        </div>
        {certs.length === 0 ? (
          <Card>
            <EmptyState icon="workspace_premium" title={t('legal.certs.empty')} />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <li key={c.id} className="flex">
                <CertificateCard cert={c} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {s.audit ? (
        <AuditCard audit={s.audit} supplier={s} />
      ) : (
        <Card padding="lg">
          <CardHeader icon="factory" title={t('legal.audit.title')} />
          <EmptyState icon="factory" title={t('legal.audit.empty')} className="py-6" />
        </Card>
      )}
    </section>
  );
}

function Field({ label, children, wide, last }: { label: string; children: ReactNode; wide?: boolean; last?: boolean }) {
  return (
    <div className={clsx('flex flex-col py-2', !last && 'border-b border-surface-container', wide && 'md:col-span-2')}>
      <dt className="mb-1 text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-on-surface">{children}</dd>
    </div>
  );
}

function LegalInfoCard({ supplier: s }: { supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const legal = s.legal;
  return (
    <Card padding="lg">
      <CardHeader
        icon="badge"
        title={t('legal.info.title')}
        actions={
          <Badge tone="success" icon="check_circle">
            {t('legal.info.statusNormal')}
          </Badge>
        }
      />
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-body-md md:grid-cols-2">
        <Field label={t('legal.info.taxCode')}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold tabular-nums">{legal.taxCode}</span>
            <Badge tone="success" className="rounded">
              {t('legal.info.active')}
            </Badge>
          </span>
        </Field>
        <Field label={t('legal.info.license')}>{t('legal.info.licenseValue', { license: legal.businessLicense, date: f.date(legal.licenseIssuedAt) })}</Field>
        <Field label={t('legal.info.representative')}>{legal.legalRepresentative}</Field>
        <Field label={t('legal.info.capital')}>
          <span className="font-semibold tabular-nums text-primary">{f.number(legal.registeredCapital)} VND</span>
          {f.locale === 'vi' && <span className="font-normal text-on-surface-variant"> ({vndToWords(legal.registeredCapital)})</span>}
        </Field>
        <Field label={t('legal.info.address')} wide>
          {legal.registeredAddress}
        </Field>
        <Field label={t('legal.info.business')} wide last>
          {legal.mainBusiness}
        </Field>
      </dl>
    </Card>
  );
}

function ValidityBadge({ validity }: { validity: CertificateValidity }) {
  const { t } = useTranslation('supplierDetail');
  if (validity.state === 'expiring')
    return (
      <Badge tone="warning" icon="schedule">
        {t('legal.certs.expiring', { count: validity.daysLeft })}
      </Badge>
    );
  if (validity.state === 'expired')
    return (
      <Badge tone="danger" icon="error">
        {t('legal.certs.expired')}
      </Badge>
    );
  return (
    <Badge tone="success" icon="check">
      {t('legal.certs.valid')}
    </Badge>
  );
}

function CertificateCard({ cert }: { cert: Certificate }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const toast = useToast();
  const validity = certificateValidity(cert, clock.now());
  const notSupported = () => toast(t('common:states.notSupported'), 'info');
  const tone = validity.state === 'expiring' ? 'warning' : cert.code.startsWith('ISO 14001') ? 'success' : 'primary';

  return (
    <Card as="article" padding="md" className="flex w-full flex-col justify-between transition-shadow hover:shadow-level-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <CertTile code={cert.code} tone={tone} />
          <ValidityBadge validity={validity} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold leading-snug text-on-surface">{cert.name}</h3>
          <p className="text-body-sm text-on-surface-variant">{cert.description}</p>
        </div>
        <dl className="flex flex-col gap-1 border-t border-surface-container pt-2 text-body-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">{t('legal.certs.issuer')}</dt>
            <dd className="text-right font-medium text-on-surface">{cert.issuer}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">{t('legal.certs.validity')}</dt>
            <dd className={clsx('text-right font-medium tabular-nums', validity.state === 'valid' ? 'text-on-surface' : validity.state === 'expiring' ? 'text-warning' : 'text-danger')}>
              {f.date(cert.validFrom)} – {f.date(cert.validTo)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-surface-container pt-4">
        <Button variant="secondary" size="sm" leftIcon="visibility" className="flex-1" onClick={notSupported}>
          {t('legal.certs.viewPdf')}
        </Button>
        <IconButton icon="download" label={t('legal.certs.download', { name: cert.name })} className="border border-outline-variant" onClick={notSupported} />
      </div>
    </Card>
  );
}

function AuditCard({ audit, supplier: s }: { audit: SupplierAudit; supplier: Supplier }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const toast = useToast();
  const metrics = [
    { value: f.number(audit.score), label: t('legal.audit.score'), className: 'text-primary' },
    { value: f.number(s.capability.factoryAreaM2), label: t('legal.audit.area'), className: 'text-success' },
    { value: f.number(s.capability.lineCount), label: t('legal.audit.lines'), className: 'text-on-surface' },
  ];
  return (
    <Card padding="lg">
      <CardHeader
        icon="factory"
        title={t('legal.audit.title')}
        actions={
          <Button variant="link" leftIcon="description" onClick={() => toast(t('common:states.notSupported'), 'info')}>
            {t('legal.audit.download')}
          </Button>
        }
      />
      <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-outline-variant bg-surface-container-low p-5 md:flex-row md:items-center">
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('rounded px-2.5 py-0.5 text-label-sm uppercase', audit.result === 'passed' ? 'bg-success-container text-success' : 'bg-danger-container text-danger')}>
              {t(`legal.audit.result.${audit.result}`)}
            </span>
            <span className="text-label-sm text-on-surface-variant">{t('legal.audit.performed', { date: monthYear(audit.date), auditor: audit.auditor })}</span>
          </div>
          <p className="text-body-md leading-relaxed text-on-surface">{audit.summary}</p>
        </div>
        <dl className="flex w-full shrink-0 items-stretch justify-around divide-x divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest p-4 md:w-auto">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col-reverse items-center px-4 text-center">
              <dt className="text-label-sm uppercase text-on-surface-variant">{m.label}</dt>
              <dd className={clsx('text-display-sm font-bold tabular-nums', m.className)}>{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
