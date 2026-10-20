import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, ButtonLink, Card, Field, Icon, Input, Textarea, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import type { Supplier } from '@/domain/types';
import { useUpdateProfile } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { FactoryPhotoTile, ProfileGate, SectionTitle, useErrorToast } from './components';
import { useRegisterProfileSave } from './ProfileSaveContext';
import { lineKindCounts, primaryContact } from './profileHelpers';
import { generalInfoSchema, type GeneralInfoFormValues } from './profileSchemas';

/** SUP-05 — Thông tin chung. */
export default function GeneralTab() {
  return <ProfileGate>{(supplier) => <GeneralContent supplier={supplier} />}</ProfileGate>;
}

const KPI_BARS = ['bg-primary', 'bg-success', 'bg-tertiary', 'bg-secondary'];
const PHOTO_DOTS = ['bg-primary', 'bg-tertiary', 'bg-success', 'bg-secondary'];

function GeneralContent({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  // Snapshot of when this data was loaded (demo clock), shown as "Cập nhật lần cuối".
  const loadedAt = useMemo(() => clock.now(), []);
  const lines = lineKindCounts(supplier.productionLines);
  const contact = primaryContact(supplier.contacts);
  const cap = supplier.capability;

  const kpis = [
    { label: t('general.kpi.area'), icon: 'factory', iconClass: 'text-primary', value: f.number(cap.factoryAreaM2), unit: 'm²', note: t('general.kpi.areaNote') },
    { label: t('general.kpi.capacity'), icon: 'bolt', iconClass: 'text-success', value: f.number(cap.monthlyCapacity), note: t('general.kpi.capacityNote', { unit: cap.capacityUnit }) },
    {
      label: t('general.kpi.lines'),
      icon: 'precision_manufacturing',
      iconClass: 'text-tertiary',
      value: f.number(cap.lineCount),
      unit: t('general.kpi.linesUnit'),
      note: t('general.kpi.linesNote', { corrugating: lines.corrugating, printing: lines.printing }),
    },
    { label: t('general.kpi.staff'), icon: 'groups', iconClass: 'text-secondary', value: f.number(cap.technicalStaff), unit: t('general.kpi.staffUnit'), note: t('general.kpi.staffNote') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <CompanyInfoCard supplier={supplier} />

      <section aria-labelledby="ops-kpis">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="ops-kpis" className="flex items-center gap-2 text-headline-sm text-on-surface">
            <Icon name="speed" className="text-primary" />
            {t('general.kpiTitle')}
          </h2>
          <span className="text-body-sm text-on-surface-variant">{t('general.lastUpdated', { time: f.dateTime(loadedAt) })}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={k.label} className="card relative overflow-hidden p-4">
              <div className="mb-2 flex items-center justify-between text-on-surface-variant">
                <span className="text-body-sm font-medium">{k.label}</span>
                <Icon name={k.icon} size={18} className={k.iconClass} />
              </div>
              <p className="text-display-sm tabular-nums text-on-surface">
                {k.value} {k.unit && <span className="text-body-lg font-normal text-on-surface-variant">{k.unit}</span>}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">{k.note}</p>
              <span className={clsx('absolute bottom-0 left-0 h-1 w-full', KPI_BARS[i])} aria-hidden />
            </div>
          ))}
        </div>
      </section>

      <Card padding="lg">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon="photo_library">{t('general.photosTitle')}</SectionTitle>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('general.photosSubtitle')}</p>
          </div>
          <Button variant="outline" size="sm" leftIcon="add_photo_alternate" onClick={() => toast(t('common:states.notSupported'), 'info')}>
            {t('photos.add')}
          </Button>
        </div>
        {supplier.photos.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low p-6 text-center text-body-md text-on-surface-variant">{t('photos.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {supplier.photos.map((p, i) => (
              <FactoryPhotoTile key={p.id} photo={p} dotClass={PHOTO_DOTS[i % PHOTO_DOTS.length]} />
            ))}
          </div>
        )}
      </Card>

      {contact && (
        <Card padding="lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
            <SectionTitle icon="support_agent">{t('general.repTitle')}</SectionTitle>
            <Badge tone="success">{t('general.primaryContact')}</Badge>
          </div>
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-outline-variant bg-surface-container-low p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar initials={contact.initials} size="xl" tone="solid" className="!h-14 !w-14 text-headline-sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-headline-sm text-on-surface">{contact.name}</h3>
                  <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">{contact.title}</span>
                </div>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('general.repResponsibility', { scope: contact.responsibility })}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm font-medium text-on-surface hover:border-primary">
                <Icon name="mail" size={18} className="text-primary" />
                {contact.email}
              </a>
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm font-medium tabular-nums text-on-surface hover:border-primary">
                <Icon name="call" size={18} className="text-primary" />
                {contact.phone}
              </a>
              <ButtonLink to="/supplier/profile/contacts" variant="secondary">
                {t('general.changeRep')}
              </ButtonLink>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReadOnlyItem({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-body-sm font-medium text-on-surface-variant">{label}</dt>
      <dd className="text-label-lg text-on-surface">{children}</dd>
      {sub && <dd className="mt-0.5 text-body-sm text-on-surface-variant">{sub}</dd>}
    </div>
  );
}

function CompanyInfoCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const update = useUpdateProfile();
  const showError = useErrorToast();
  const [editing, setEditing] = useState(false);
  const currentYear = clock.now().getFullYear();
  const schema = useMemo(() => generalInfoSchema(currentYear), [currentYear]);

  const defaults: GeneralInfoFormValues = {
    description: supplier.description,
    foundedYear: supplier.foundedYear,
    employeesLabel: supplier.employeesLabel,
    website: supplier.website ?? '',
  };
  const form = useForm<GeneralInfoFormValues>({ resolver: zodResolver(schema), values: defaults });
  const { register, handleSubmit, formState, reset } = form;
  const e = formState.errors;

  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ description: v.description, foundedYear: v.foundedYear, employeesLabel: v.employeesLabel, website: v.website || undefined });
      toast(t('common:toast.saved'));
      setEditing(false);
    } catch (err) {
      showError(err);
    }
  });

  useRegisterProfileSave({ save: () => submit(), dirty: editing && formState.isDirty, saving: update.isPending });

  const cancel = () => {
    reset(defaults);
    setEditing(false);
  };
  const years = currentYear - supplier.foundedYear;

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
        <SectionTitle icon="domain">{t('general.companyTitle')}</SectionTitle>
        {!editing && (
          <Button variant="link" leftIcon="edit" onClick={() => setEditing(true)}>
            {t('common:actions.edit')}
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ReadOnlyItem label={t('general.legalName')} sub={t('general.englishName', { name: supplier.legal.englishName })}>
          {supplier.legal.legalName}
        </ReadOnlyItem>
        <ReadOnlyItem label={t('general.taxCode')} sub={t('general.issuedAt', { date: f.date(supplier.legal.licenseIssuedAt) })}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums">{supplier.legal.taxCode}</span>
            <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">{t('general.taxVerified')}</span>
          </span>
        </ReadOnlyItem>
        {!editing && (
          <ReadOnlyItem label={t('general.foundedAndHq')} sub={supplier.locationLabel}>
            {t('general.foundedValue', { year: supplier.foundedYear, count: years })}
          </ReadOnlyItem>
        )}
        {!editing && (
          <>
            <ReadOnlyItem label={t('general.employees')}>{supplier.employeesLabel}</ReadOnlyItem>
            <ReadOnlyItem label={t('general.website')}>
              {supplier.website ? (
                <a href={`https://${supplier.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {supplier.website}
                </a>
              ) : (
                <span className="font-normal text-on-surface-variant">{t('common:labels.none')}</span>
              )}
            </ReadOnlyItem>
          </>
        )}
      </dl>

      {editing ? (
        <form
          className="mt-4 grid grid-cols-1 gap-4 border-t border-outline-variant/60 pt-4 md:grid-cols-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
          noValidate
        >
          <Field label={t('general.foundedYear')} htmlFor="gi-year" required error={e.foundedYear?.message}>
            <Input id="gi-year" type="number" inputMode="numeric" invalid={!!e.foundedYear} {...register('foundedYear', { valueAsNumber: true })} />
          </Field>
          <Field label={t('general.employees')} htmlFor="gi-emp" error={e.employeesLabel?.message}>
            <Input id="gi-emp" placeholder={t('general.employeesPlaceholder')} {...register('employeesLabel')} />
          </Field>
          <Field label={t('general.website')} htmlFor="gi-web" error={e.website?.message}>
            <Input id="gi-web" leftIcon="language" placeholder="example.vn" {...register('website')} />
          </Field>
          <Field label={t('general.description')} htmlFor="gi-desc" required error={e.description?.message} className="md:col-span-3">
            <Textarea id="gi-desc" rows={5} invalid={!!e.description} {...register('description')} />
          </Field>
          <div className="flex justify-end gap-2 md:col-span-3">
            <Button variant="secondary" onClick={cancel}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" leftIcon="save" loading={update.isPending} disabled={!formState.isDirty}>
              {t('common:actions.saveChanges')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 border-t border-outline-variant/60 pt-4">
          <p className="mb-1 text-body-sm font-medium text-on-surface-variant">{t('general.description')}</p>
          <p className="whitespace-pre-line rounded-lg border border-outline-variant bg-surface-container-low p-3.5 text-body-md leading-relaxed text-on-surface">{supplier.description}</p>
        </div>
      )}
    </Card>
  );
}
