import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Fragment, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AttachmentRow, Avatar, Badge, Card, Field, FileDropzone, Icon, IconButton, Input, Select, Textarea, useToast } from '@/components/ui';
import { CATEGORIES, UNITS } from '@/domain/catalog';
import { clock, daysBetween } from '@/domain/clock';
import { deadlineInfo, dimensionsError, formatDimensions, MAX_SUPPLIERS_PER_RFQ, rfqStep1Schema, splitDimensions, validateDates, type Dimensions } from '@/domain/rfq';
import type { Attachment, CategoryId } from '@/domain/types';
import { useUpdateRfqDraft } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { RfqDraftPatch } from '@/services';
import { invitedSuppliers, SealedBidNote, SectionCard, SummaryRow, useAutosave, useErrorText, useRegisterSaver, WizardFooter, WizardLayout, type StepProps } from './parts';
import { dateInputToIso, dateTimeInputToIso, isoToDateInput, isoToDateTimeInput } from './wizardHelpers';

interface Step1Form {
  title: string;
  categoryId: string;
  subcategory: string;
  productName: string;
  /** Size in cm, one field per side; stored on the RFQ as "L × W × H cm". */
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  material: string;
  finishing: string;
  quantity: string;
  unit: string;
  deliveryAddress: string;
  /** `datetime-local` value. */
  deadline: string;
  /** `date` value. */
  neededBy: string;
}

const zod = zodResolver(rfqStep1Schema);

const DIM_FIELDS = { length: 'dimLength', width: 'dimWidth', height: 'dimHeight' } as const;

const dimensionsOf = (v: Pick<Step1Form, 'dimLength' | 'dimWidth' | 'dimHeight'>): Dimensions => ({ length: v.dimLength, width: v.dimWidth, height: v.dimHeight });

/** Schema validation plus the date rules that depend on "now". */
const step1Resolver: Resolver<Step1Form> = async (values, context, options) => {
  const result = await zod(values as never, context, options as never);
  const errors = { ...(result.errors as FieldErrors<Step1Form>) };
  const dateErrors = validateDates({ deadline: dateTimeInputToIso(values.deadline), neededBy: dateInputToIso(values.neededBy) }, clock.now());
  for (const key of ['deadline', 'neededBy'] as const) {
    const message = dateErrors[key];
    if (message && !errors[key]) errors[key] = { type: 'validate', message };
  }
  const dimError = dimensionsError(dimensionsOf(values));
  if (dimError) errors[DIM_FIELDS[dimError.side]] = { type: 'validate', message: dimError.message };
  return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} };
};

export default function Step1Info({ detail, goTo, registerSaver }: StepProps) {
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const { rfq } = detail;
  const update = useUpdateRfqDraft(rfq.id);
  const [attachments, setAttachments] = useState<Attachment[]>(rfq.attachments);
  const [busy, setBusy] = useState<'draft' | 'next' | null>(null);
  const initialDims = splitDimensions(rfq.dimensions).dimensions;

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Form>({
    resolver: step1Resolver,
    mode: 'onTouched',
    defaultValues: {
      title: rfq.title,
      categoryId: rfq.categoryId,
      subcategory: rfq.subcategory,
      productName: rfq.productName,
      dimLength: initialDims?.length ?? '',
      dimWidth: initialDims?.width ?? '',
      dimHeight: initialDims?.height ?? '',
      material: rfq.material,
      finishing: rfq.finishing,
      quantity: rfq.quantity > 0 ? String(rfq.quantity) : '',
      unit: rfq.unit,
      deliveryAddress: rfq.deliveryAddress,
      deadline: isoToDateTimeInput(rfq.deadline),
      neededBy: isoToDateInput(rfq.neededBy),
    },
  });

  const values = watch();

  const toPatch = (v: Step1Form): RfqDraftPatch => {
    const quantity = Number(v.quantity);
    return {
      title: v.title.trim(),
      categoryId: v.categoryId as CategoryId,
      subcategory: v.subcategory,
      productName: v.productName.trim(),
      dimensions: formatDimensions(dimensionsOf(v)),
      material: v.material.trim(),
      finishing: v.finishing.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 0,
      unit: v.unit,
      deliveryAddress: v.deliveryAddress.trim(),
      deadline: dateTimeInputToIso(v.deadline) || rfq.deadline,
      neededBy: dateInputToIso(v.neededBy) || rfq.neededBy,
      attachments,
    };
  };

  const saveSilently = () => update.mutateAsync(toPatch(getValues()));
  useRegisterSaver(registerSaver, saveSilently);
  useAutosave(JSON.stringify([values, attachments]), saveSilently);

  const saveDraft = async () => {
    setBusy('draft');
    try {
      await saveSilently();
      toast(t('common:toast.draftSaved'));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const next = handleSubmit(
    async (v) => {
      setBusy('next');
      try {
        await update.mutateAsync({ ...toPatch(v), completedStep: Math.max(rfq.completedStep, 1) });
        registerSaver(null);
        goTo(2);
      } catch (e) {
        toast(errorText(e), 'error');
      } finally {
        setBusy(null);
      }
    },
    () => toast(t('validation.fixErrors'), 'error'),
  );

  const category = CATEGORIES.find((c) => c.id === values.categoryId);
  const subcategories = category ? [...category.subcategories] : [];
  if (values.subcategory && !subcategories.includes(values.subcategory)) subcategories.unshift(values.subcategory);
  const units: string[] = [...UNITS];
  if (values.unit && !units.includes(values.unit)) units.unshift(values.unit);

  const deadlineIso = dateTimeInputToIso(values.deadline);
  const neededIso = dateInputToIso(values.neededBy);
  const now = clock.now();
  const deadlineDays = deadlineIso ? deadlineInfo(deadlineIso, now) : null;
  const leadDays = deadlineIso && neededIso ? daysBetween(deadlineIso, neededIso) : null;

  const specsOk = rfqStep1Schema.safeParse({ ...values }).success;
  const suppliers = invitedSuppliers(detail);
  const removeSupplier = (id: string) =>
    update.mutate(
      { supplierIds: rfq.invitations.map((i) => i.supplierId).filter((s) => s !== id) },
      { onError: (e) => toast(errorText(e), 'error') },
    );

  const err = (key: keyof Step1Form) => errors[key]?.message;

  const main = (
    <>
      <SectionCard icon="feed" title={t('step1.generalTitle')} aside={<span className="text-body-sm text-outline">{t('step1.requiredNote')}</span>}>
        <div className="flex flex-col gap-4">
          <Field label={t('step1.title')} required htmlFor="rfq-title" hint={t('step1.titleHint')} error={err('title')}>
            <Input id="rfq-title" {...register('title')} invalid={Boolean(errors.title)} placeholder={t('step1.titlePlaceholder')} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('step1.category')} required htmlFor="rfq-category" error={err('categoryId')}>
              <Select
                id="rfq-category"
                {...register('categoryId', {
                  onChange: (e: { target: { value: string } }) => {
                    const next = CATEGORIES.find((c) => c.id === e.target.value);
                    if (next && !next.subcategories.includes(getValues('subcategory'))) setValue('subcategory', '', { shouldValidate: false });
                  },
                })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(`common:${c.labelKey}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('step1.subcategory')} required htmlFor="rfq-subcategory" error={err('subcategory')}>
              <Select id="rfq-subcategory" {...register('subcategory')} invalid={Boolean(errors.subcategory)}>
                <option value="">{t('step1.subcategoryPlaceholder')}</option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon="inventory_2"
        title={t('step1.specTitle')}
        aside={
          <button type="button" onClick={() => toast(t('common:states.notSupported'), 'info')} className="inline-flex items-center gap-1 text-label-md text-tertiary hover:underline">
            <Icon name="content_copy" size={16} />
            {t('step1.loadTemplate')}
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('step1.productName')} required htmlFor="rfq-product" error={err('productName')}>
            <Input id="rfq-product" {...register('productName')} invalid={Boolean(errors.productName)} placeholder={t('step1.productNamePlaceholder')} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t('step1.dimensions')}
              htmlFor="rfq-dim-length"
              error={err('dimLength') ?? err('dimWidth') ?? err('dimHeight')}
              labelAside={<span className="text-body-sm text-outline">cm</span>}
            >
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ['dimLength', 'rfq-dim-length', 'step1.dimLength'],
                    ['dimWidth', 'rfq-dim-width', 'step1.dimWidth'],
                    ['dimHeight', 'rfq-dim-height', 'step1.dimHeight'],
                  ] as const
                ).map(([name, id, label], i) => (
                  <Fragment key={name}>
                    {i > 0 && (
                      <span aria-hidden className="text-body-md text-outline">
                        ×
                      </span>
                    )}
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      aria-label={t(label)}
                      title={t(label)}
                      placeholder={t(label)}
                      {...register(name)}
                      invalid={Boolean(errors[name])}
                      className="min-w-0 flex-1"
                      inputClassName="font-mono"
                    />
                  </Fragment>
                ))}
              </div>
            </Field>
            <Field label={t('step1.material')} htmlFor="rfq-material">
              <Input id="rfq-material" {...register('material')} placeholder={t('step1.materialPlaceholder')} />
            </Field>
          </div>
          <Field label={t('step1.finishing')} htmlFor="rfq-finishing">
            <Textarea id="rfq-finishing" rows={2} {...register('finishing')} className="resize-none" placeholder={t('step1.finishingPlaceholder')} />
          </Field>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3.5 sm:grid-cols-3">
            <Field label={t('step1.quantity')} required htmlFor="rfq-quantity" error={err('quantity')} className="sm:col-span-2">
              <Input id="rfq-quantity" type="number" min={1} step={1} inputMode="numeric" {...register('quantity')} invalid={Boolean(errors.quantity)} inputClassName="!h-10 font-mono !text-headline-sm" />
            </Field>
            <Field label={t('step1.unit')} required htmlFor="rfq-unit" error={err('unit')}>
              <Select id="rfq-unit" {...register('unit')}>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-md text-on-surface">{t('step1.attachments')}</span>
              <span className="text-body-sm text-outline">{t('step1.maxSize', { size: 25 })}</span>
            </div>
            {attachments.map((a) => (
              <AttachmentRow
                key={a.id}
                file={a}
                subtitle={t('step1.uploaded')}
                removeLabel={t('step1.removeFile', { name: a.name })}
                onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
              />
            ))}
            <FileDropzone
              compact
              maxSizeMb={25}
              accept=".pdf,.dwg,.dxf,.ai,.png,.jpg,.jpeg,.zip"
              title={t('step1.dropTitle')}
              hint={t('step1.dropHint')}
              onFiles={(files) => setAttachments((prev) => [...prev, ...files])}
              onError={() => toast(t('common:validation.fileTooLarge'), 'error')}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon="local_shipping" title={t('step1.deliveryTitle')}>
        <div className="flex flex-col gap-4">
          <Field label={t('step1.address')} required htmlFor="rfq-address" error={err('deliveryAddress')}>
            <Input id="rfq-address" leftIcon="location_on" {...register('deliveryAddress')} invalid={Boolean(errors.deliveryAddress)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-outline-variant p-3.5">
              <Field
                label={t('step1.deadline')}
                required
                htmlFor="rfq-deadline"
                error={err('deadline')}
                hint={deadlineIso ? t('step1.lockAt', { time: f.time(deadlineIso) }) : undefined}
                labelAside={
                  deadlineDays && deadlineDays.hoursLeft > 0 ? (
                    <Badge tone={deadlineDays.daysLeft <= 3 ? 'danger' : 'warning'}>{deadlineDays.daysLeft === 0 ? t('common:deadline.today') : t('step1.daysLeft', { count: deadlineDays.daysLeft })}</Badge>
                  ) : undefined
                }
              >
                <Input id="rfq-deadline" type="datetime-local" min={isoToDateTimeInput(now.toISOString())} {...register('deadline')} invalid={Boolean(errors.deadline)} inputClassName="font-mono" />
              </Field>
            </div>
            <div className="rounded-lg border border-outline-variant p-3.5">
              <Field
                label={t('step1.neededBy')}
                required
                htmlFor="rfq-needed"
                error={err('neededBy')}
                hint={leadDays !== null && leadDays > 0 ? t('step1.leadTime', { count: leadDays }) : undefined}
              >
                <Input id="rfq-needed" type="date" min={values.deadline.slice(0, 10) || undefined} {...register('neededBy')} invalid={Boolean(errors.neededBy)} inputClassName="font-mono" />
              </Field>
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );

  const aside = (
    <>
      <Card padding="md">
        <div className="mb-3 flex items-start justify-between gap-2 border-b border-outline-variant pb-3">
          <div>
            <h2 className="text-label-lg text-on-surface">{t('suppliersCard.title')}</h2>
            <p className="text-body-sm text-on-surface-variant">{t('suppliersCard.assigned', { count: suppliers.length })}</p>
          </div>
          <span className="whitespace-nowrap rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-primary">{t('suppliersCard.max', { count: suppliers.length, max: MAX_SUPPLIERS_PER_RFQ })}</span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {suppliers.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant p-2.5 transition-colors hover:border-primary">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar initials={s.initials} size="sm" square tone="neutral" className="!text-primary" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-label-md text-on-surface">
                    <span className="truncate">{s.name}</span>
                    {s.verified && <Icon name="verified" filled size={14} className="text-primary" />}
                  </p>
                  <p className="truncate text-[11px] text-on-surface-variant">{t('suppliersCard.meta', { location: t(`common:provinces.${s.province}`), rating: s.rating.toFixed(1) })}</p>
                </div>
              </div>
              <IconButton icon="close" size={16} label={t('suppliersCard.remove', { name: s.name })} onClick={() => removeSupplier(s.id)} className="hover:!text-danger" />
            </li>
          ))}
          {suppliers.length === 0 && <li className="rounded-lg bg-surface-container-low p-3 text-center text-body-sm text-on-surface-variant">{t('suppliersCard.none')}</li>}
        </ul>
        <button
          type="button"
          onClick={() => goTo(2)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant px-3 py-2 text-label-md text-primary transition-colors hover:bg-primary-fixed/20"
        >
          <Icon name="person_add" size={18} />
          {t('suppliersCard.add')}
        </button>
        <SealedBidNote className="mt-4" />
      </Card>

      <Card padding="md">
        <h2 className="mb-3 text-label-lg text-on-surface">{t('step1.progressTitle')}</h2>
        <div className="flex flex-col gap-2.5">
          <SummaryRow label={t('step1.progress.specs')}>
            <span className={clsx('inline-flex items-center gap-1 font-semibold', specsOk ? 'text-success' : 'text-warning')}>
              <Icon name={specsOk ? 'check' : 'pending'} size={16} />
              {specsOk ? t('step1.progress.done') : t('step1.progress.pending')}
            </span>
          </SummaryRow>
          <SummaryRow label={t('step1.progress.files')}>
            <span className={clsx('inline-flex items-center gap-1 font-semibold', attachments.length ? 'text-success' : 'text-on-surface-variant')}>
              {attachments.length > 0 && <Icon name="check" size={16} />}
              {t('step1.progress.fileCount', { count: attachments.length })}
            </span>
          </SummaryRow>
          <SummaryRow label={t('step1.progress.quantity')}>
            <span className="font-mono font-bold">{Number(values.quantity) > 0 ? `${f.number(Number(values.quantity))} ${values.unit}` : '—'}</span>
          </SummaryRow>
          <SummaryRow label={t('step1.progress.address')}>
            <span className="block max-w-[180px] truncate" title={values.deliveryAddress}>
              {values.deliveryAddress || '—'}
            </span>
          </SummaryRow>
          <SummaryRow label={t('step1.progress.deadline')} className="border-t border-outline-variant/50 pt-2">
            <span className="font-mono font-semibold text-warning">{deadlineIso ? f.date(deadlineIso) : '—'}</span>
          </SummaryRow>
        </div>
      </Card>
    </>
  );

  return (
    <>
      <WizardLayout main={main} aside={aside} />
      <WizardFooter
        code={rfq.code}
        onSaveDraft={() => void saveDraft()}
        saving={busy === 'draft'}
        backLabel={t('common:actions.back')}
        onBack={() => goTo('list')}
        nextLabel={t('footer.continueTo', { step: 2, name: t('steps.2') })}
        onNext={() => void next()}
        nextLoading={busy === 'next'}
      />
    </>
  );
}
