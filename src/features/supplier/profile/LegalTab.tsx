import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AttachmentRow, Button, Card, Field, FileDropzone, Icon, Input, Select, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import { vndToWords } from '@/domain/quotation';
import type { Attachment, Certificate, Supplier } from '@/domain/types';
import { useAddCertificate } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { ProfileGate, useErrorToast } from './components';
import { certificateValidity, monthYear, verifiedCertificates } from './profileHelpers';
import { certificateSchema, type CertificateFormValues } from './profileSchemas';

/** Certificate types offered by the upload form ("descKey" → profile:legal.certTypes.*). */
const CERT_TYPES: { name: string; descKey?: string }[] = [
  { name: 'ISO 22000', descKey: 'iso22000' },
  { name: 'HACCP', descKey: 'haccp' },
  { name: 'BRC Packaging', descKey: 'brc' },
  { name: 'RoHS Compliance', descKey: 'rohs' },
  { name: 'REACH', descKey: 'reach' },
  { name: 'Oeko-Tex Standard 100', descKey: 'oekotex' },
  { name: 'SMETA / SEDEX', descKey: 'smeta' },
  { name: 'ISO 9001:2015' },
  { name: 'ISO 14001:2015' },
  { name: 'ISO 45001:2018' },
  { name: 'FSC CoC' },
];

/** SUP-05d — Chứng chỉ & Pháp lý. */
export default function LegalTab() {
  return <ProfileGate>{(supplier) => <LegalContent supplier={supplier} />}</ProfileGate>;
}

function LegalContent({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const formRef = useRef<CertificateFormHandle | null>(null);
  const verified = verifiedCertificates(supplier.certificates);
  const pending = supplier.certificates.filter((c) => c.status === 'pending');
  // File names submitted in this session (the API keeps certificates, not files).
  const [submittedFiles, setSubmittedFiles] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-success-border bg-success-container p-4 shadow-level-1 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-success">
            <Icon name="verified" filled />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-label-lg text-[#14532D]">
              {t('legal.bannerTitle')}
              <span className="font-normal text-success" aria-hidden>
                ·
              </span>
              <span className="text-body-sm font-normal text-[#15803D]">{t('legal.bannerUpdated', { date: monthYear(supplier.legal.verifiedAt) })}</span>
            </p>
            <p className="mt-0.5 text-[12px] tracking-wide text-[#166534]">
              {t('legal.bannerId')} <span className="font-bold tabular-nums underline decoration-dotted">PR-VER-{supplier.legal.taxCode}</span>
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#16A34A] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-level-1">{t('legal.enterprise')}</span>
      </div>

      <LegalEntityCard supplier={supplier} />

      <section aria-labelledby="certs-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="certs-title" className="text-headline-md text-procura-navy">
              {t('legal.certsTitle')}
            </h2>
            <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-label-sm text-procura-navy">{t('legal.certsCount', { count: verified.length })}</span>
          </div>
          <span className="text-body-sm text-outline">{t('legal.certsNote')}</span>
        </div>
        {verified.length === 0 ? (
          <Card>
            <p className="text-center text-body-md text-on-surface-variant">{t('legal.noCerts')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {verified.map((c) => (
              <CertificateCard key={c.id} cert={c} onRenew={() => formRef.current?.prefill(c.name)} />
            ))}
          </div>
        )}
      </section>

      <CertificateUploadForm
        supplier={supplier}
        handleRef={formRef}
        onSubmitted={(id, fileName) => setSubmittedFiles((m) => ({ ...m, [id]: fileName }))}
      />

      <PendingList pending={pending} files={submittedFiles} />
    </div>
  );
}

function VerifiedTag() {
  const { t } = useTranslation('profile');
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-primary">
      <Icon name="check" filled size={12} />
      {t('legal.verifiedTag')}
    </span>
  );
}

function LegalItem({ label, children, sub, className }: { label: string; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col gap-1.5 rounded-lg border border-[#E2E8F0]/70 bg-[#F8FAFC] p-3', className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-outline">{label}</dt>
      <dd className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[14px] font-bold leading-5 text-procura-navy">{children}</span>
          {sub && <span className="text-[11px] text-on-surface-variant">{sub}</span>}
        </div>
        <VerifiedTag />
      </dd>
    </div>
  );
}

function LegalEntityCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const legal = supplier.legal;
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-[#E2E8F0] p-5 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-headline-md text-procura-navy">{t('legal.entityTitle')}</h2>
            {supplier.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-container px-2.5 py-0.5 text-[11px] font-semibold text-success">
                <Icon name="check_circle" filled size={13} />
                {t('legal.activeStatus')}
              </span>
            )}
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">{t('legal.entityNote')}</p>
        </div>
        <Button variant="secondary" size="sm" leftIcon="history" className="self-start md:self-center" onClick={() => toast(t('common:states.notSupported'), 'info')}>
          {t('legal.auditLog')}
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        <LegalItem label={t('legal.taxCode')}>
          <span className="tabular-nums">{legal.taxCode}</span>
        </LegalItem>
        <LegalItem label={t('legal.license')}>
          <span className="font-medium">{t('legal.licenseValue', { license: legal.businessLicense, date: f.date(legal.licenseIssuedAt) })}</span>
        </LegalItem>
        <LegalItem label={t('legal.representative')}>{legal.legalRepresentative}</LegalItem>
        <LegalItem label={t('legal.capital')} sub={f.locale === 'vi' ? `(${vndToWords(legal.registeredCapital)})` : undefined}>
          <span className="tabular-nums">{t('legal.capitalValue', { value: f.number(legal.registeredCapital) })}</span>
        </LegalItem>
        <LegalItem label={t('legal.address')} className="lg:col-span-2">
          <span className="font-medium">{legal.registeredAddress}</span>
        </LegalItem>
        <LegalItem label={t('legal.mainBusiness')} className="md:col-span-2 lg:col-span-3">
          <span className="font-normal text-on-surface">{legal.mainBusiness}</span>
        </LegalItem>
      </dl>
    </Card>
  );
}

function CertificateCard({ cert, onRenew }: { cert: Certificate; onRenew: () => void }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const validity = certificateValidity(cert.validTo, clock.now());
  const warn = validity.state !== 'valid';
  const notSupported = () => toast(t('common:states.notSupported'), 'info');

  return (
    <article className={clsx('flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-level-2', warn ? 'border-2 border-warning-border' : 'border border-[#E2E8F0]')}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', warn ? 'border-warning-border bg-warning-container text-warning' : 'border-[#BFDBFE] bg-[#EFF6FF] text-primary')}>
            <Icon name={cert.code.startsWith('FSC') ? 'forest' : 'verified'} size={24} />
          </span>
          {validity.state === 'valid' ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-success-border bg-success-container px-2.5 py-1 text-[11px] font-semibold text-success">
              <Icon name="check_circle" filled size={12} />
              {t('legal.validity.valid')}
            </span>
          ) : validity.state === 'expiring' ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-warning-border bg-warning-container px-2.5 py-1 text-[11px] font-semibold text-warning">
              <Icon name="warning" size={12} />
              {t('legal.validity.expiring', { count: validity.daysLeft })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-danger-border bg-danger-container px-2.5 py-1 text-[11px] font-semibold text-danger">
              <Icon name="error" size={12} />
              {t('legal.validity.expired')}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-headline-sm text-procura-navy">{cert.name}</h3>
          <p className="text-body-sm text-on-surface-variant">{cert.description}</p>
        </div>
        <dl className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-2 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-on-surface-variant">{t('legal.issuer')}</dt>
            <dd className="text-right font-semibold text-on-surface">{cert.issuer}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-on-surface-variant">{t('legal.number')}</dt>
            <dd className="text-right font-bold tabular-nums text-procura-navy">{cert.number}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-on-surface-variant">{t('legal.validRange')}</dt>
            <dd className={clsx('text-right tabular-nums', warn ? 'font-bold text-warning' : 'font-medium text-on-surface')}>
              {f.date(cert.validFrom)} – {f.date(cert.validTo)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <dt className="text-on-surface-variant">{t('common:labels.status')}:</dt>
            <dd className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <Icon name="shield" filled size={13} />
              {t('legal.verifiedByProcura')}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[#E2E8F0] pt-4">
        {warn ? (
          <>
            <Button variant="secondary" size="sm" leftIcon="picture_as_pdf" onClick={notSupported} aria-label={t('legal.viewPdf')}>
              PDF
            </Button>
            <Button size="sm" leftIcon="upload_file" className="flex-1" onClick={onRenew}>
              {t('legal.renew')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" leftIcon="picture_as_pdf" className="flex-1" onClick={notSupported}>
              {t('legal.viewPdf')}
            </Button>
            <Button variant="secondary" size="sm" onClick={notSupported}>
              {t('legal.replace')}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

interface CertificateFormHandle {
  prefill: (name: string) => void;
}

function CertificateUploadForm({
  supplier,
  handleRef,
  onSubmitted,
}: {
  supplier: Supplier;
  handleRef: RefObject<CertificateFormHandle | null>;
  onSubmitted: (certId: string, fileName: string) => void;
}) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const add = useAddCertificate();
  const sectionRef = useRef<HTMLElement>(null);
  const [file, setFile] = useState<Attachment | null>(null);
  const schema = useMemo(() => certificateSchema(clock.now()), []);
  const empty: CertificateFormValues = { fileName: '', name: '', issuer: '', number: '', validTo: '' };
  const { register, handleSubmit, formState, setValue, reset, setFocus } = useForm<CertificateFormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  const e = formState.errors;

  const types = useMemo(() => {
    const names = new Set(CERT_TYPES.map((c) => c.name));
    const extra = supplier.certificates.map((c) => c.name).filter((n) => !names.has(n));
    return [...CERT_TYPES, ...[...new Set(extra)].map((name) => ({ name }) as { name: string; descKey?: string })];
  }, [supplier.certificates]);

  useEffect(() => {
    handleRef.current = {
    prefill: (name) => {
      setValue('name', name, { shouldDirty: true, shouldValidate: true });
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => setFocus('issuer'), 300);
    },
    };
  });

  const pickFile = (files: Attachment[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setValue('fileName', f.name, { shouldValidate: true, shouldDirty: true });
  };

  const submit = handleSubmit(async (v) => {
    try {
      const cert = await add.mutateAsync(v);
      onSubmitted(cert.id, v.fileName);
      toast(t('legal.submitted', { name: v.name }));
      reset(empty);
      setFile(null);
    } catch (err) {
      showError(err);
    }
  });

  return (
    <section ref={sectionRef} aria-labelledby="cert-upload-title" className="card scroll-mt-24 p-6">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 id="cert-upload-title" className="text-headline-md text-procura-navy">
              {t('legal.uploadTitle')}
            </h2>
            <p className="text-body-sm text-on-surface-variant">{t('legal.uploadSubtitle')}</p>
          </div>
          <Icon name="verified" className="text-outline" />
        </div>

        <Field error={e.fileName?.message}>
          {file ? (
            <AttachmentRow
              file={file}
              removeLabel={t('common:actions.remove')}
              onRemove={() => {
                setFile(null);
                setValue('fileName', '', { shouldDirty: true });
              }}
            />
          ) : (
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple={false}
              maxSizeMb={15}
              title={t('legal.dropTitle')}
              hint={t('legal.dropHint')}
              onFiles={pickFile}
              onError={(m) => toast(t(`common:${m}`), 'error')}
              className={e.fileName ? '!border-danger' : undefined}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label={t('legal.f.type')} htmlFor="ct-type" required error={e.name?.message}>
            <Select id="ct-type" invalid={!!e.name} {...register('name')}>
              <option value="">{t('legal.f.typePlaceholder')}</option>
              {types.map((ct) => (
                <option key={ct.name} value={ct.name}>
                  {ct.descKey ? `${ct.name} (${t(`legal.certTypes.${ct.descKey}`)})` : ct.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('legal.f.issuer')} htmlFor="ct-issuer" required error={e.issuer?.message}>
            <Input id="ct-issuer" placeholder={t('legal.f.issuerPlaceholder')} invalid={!!e.issuer} {...register('issuer')} />
          </Field>
          <Field label={t('legal.f.number')} htmlFor="ct-number" required error={e.number?.message}>
            <Input id="ct-number" placeholder={t('legal.f.numberPlaceholder')} invalid={!!e.number} {...register('number')} />
          </Field>
          <Field label={t('legal.f.validTo')} htmlFor="ct-valid" required error={e.validTo?.message}>
            <Input id="ct-valid" type="date" invalid={!!e.validTo} {...register('validTo')} />
          </Field>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
          <span className="flex items-center gap-1 text-[12px] text-outline">
            <Icon name="info" size={15} />
            {t('legal.reviewNote')}
          </span>
          <Button type="submit" leftIcon="send" loading={add.isPending}>
            {t('legal.submit')}
          </Button>
        </div>
      </form>
    </section>
  );
}

const STEPS = ['submitted', 'reviewing', 'result'] as const;

function PendingList({ pending, files }: { pending: Certificate[]; files: Record<string, string> }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-surface-container-low px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-headline-sm text-procura-navy">
          <Icon name="pending_actions" size={18} className="text-warning" />
          {t('legal.pendingTitle', { count: pending.length })}
        </h2>
        <span className="text-label-sm text-outline">{t('legal.pendingNote')}</span>
      </div>
      {pending.length === 0 ? (
        <p className="p-6 text-center text-body-md text-on-surface-variant">{t('legal.noPending')}</p>
      ) : (
        <ul className="divide-y divide-[#E2E8F0]">
          {pending.map((c) => (
            <li key={c.id} className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-[#F8FAFC] lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-warning-border bg-warning-container text-warning">
                  <Icon name="description" size={22} />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-label-lg text-procura-navy">{c.name}</span>
                    {c.description !== c.name && <span className="text-[12px] text-on-surface-variant">({c.description})</span>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-on-surface-variant">
                    <span>
                      {t('legal.issuer')} <strong className="text-on-surface">{c.issuer}</strong>
                    </span>
                    {c.submittedAt && (
                      <span>
                        {t('legal.submittedOn')} <strong className="text-on-surface">{f.date(c.submittedAt)}</strong>
                      </span>
                    )}
                    {files[c.id] && <span className="tabular-nums">{t('legal.file', { name: files[c.id] })}</span>}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-container px-3 py-1 text-[11px] font-semibold text-warning">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-warning" aria-hidden />
                  {t('legal.pendingBadge')}
                </span>
                <ol className="flex items-center gap-1.5" aria-label={t('legal.progressAria')}>
                  {STEPS.map((s, i) => {
                    const state = i === 0 ? 'done' : i === 1 ? 'current' : 'todo';
                    return (
                      <li key={s} className="flex items-center gap-1.5" aria-current={state === 'current' ? 'step' : undefined}>
                        {i > 0 && <span className={clsx('h-px w-5', state === 'todo' ? 'bg-outline-variant' : 'bg-primary')} aria-hidden />}
                        <span
                          className={clsx(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                            state === 'done' && 'bg-primary text-on-primary',
                            state === 'current' && 'border-2 border-primary bg-surface-container-lowest text-primary',
                            state === 'todo' && 'bg-surface-container-high text-on-surface-variant',
                          )}
                        >
                          {state === 'done' ? <Icon name="check" size={12} /> : i + 1}
                        </span>
                        <span className={clsx('text-[11px]', state === 'todo' ? 'text-on-surface-variant' : 'font-semibold text-on-surface')}>{t(`legal.steps.${s}`)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
