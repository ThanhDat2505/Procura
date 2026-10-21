import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, Callout, Card, Chip, Field, Icon, Input, MoneyInput, Select, Switch, Textarea, useToast } from '@/components/ui';
import { CERTIFICATION_OPTIONS, PAYMENT_TERM_OPTIONS } from '@/domain/catalog';
import { MAX_SUPPLIERS_PER_RFQ, rfqStep3Schema, weightsTotal } from '@/domain/rfq';
import type { EvaluationWeights } from '@/domain/types';
import { useUpdateRfqDraft } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { RfqDraftPatch } from '@/services';
import { invitedSuppliers, SectionCard, SummaryRow, useAutosave, useErrorText, useRegisterSaver, WizardFooter, WizardLayout, type StepProps } from './parts';
import { parseOptionalNumber } from './wizardHelpers';

interface Step3Form {
  vatIncluded: boolean;
  paymentTerms: string;
  minValidityDays: string;
  sampleRequired: boolean;
  sampleQuantity: string;
  sampleNote: string;
  requiredCertifications: string[];
  weights: EvaluationWeights;
  notesToSuppliers: string;
  budgetMin: string;
  budgetMax: string;
}

const VALIDITY_DAYS = [15, 30, 45, 60];
const WEIGHT_KEYS: (keyof EvaluationWeights)[] = ['price', 'leadTime', 'moq', 'quality'];

function toCandidate(v: Step3Form) {
  return {
    vatIncluded: v.vatIncluded,
    paymentTerms: v.paymentTerms,
    minValidityDays: Number(v.minValidityDays),
    sampleRequired: v.sampleRequired,
    sampleQuantity: v.sampleRequired ? (parseOptionalNumber(v.sampleQuantity) ?? 0) : 0,
    sampleNote: v.sampleRequired ? v.sampleNote.trim() : '',
    requiredCertifications: v.requiredCertifications,
    weights: v.weights,
    notesToSuppliers: v.notesToSuppliers.trim(),
    budgetMin: parseOptionalNumber(v.budgetMin),
    budgetMax: parseOptionalNumber(v.budgetMax),
  };
}

/** `rfqStep3Schema` plus the cross-field rules of this form (sample quantity, budget range). */
const step3Resolver: Resolver<Step3Form> = async (values) => {
  const candidate = toCandidate(values);
  const parsed = rfqStep3Schema.safeParse(candidate);
  const errors: FieldErrors<Step3Form> = {};
  const put = (key: keyof Step3Form, message: string) => {
    if (!errors[key]) (errors as Record<string, { type: string; message: string }>)[key] = { type: 'validate', message };
  };
  if (!parsed.success) for (const issue of parsed.error.issues) put(issue.path[0] as keyof Step3Form, issue.message);
  if (candidate.sampleRequired && candidate.sampleQuantity < 1) put('sampleQuantity', 'validation.positive');
  if (candidate.budgetMin !== undefined && candidate.budgetMax !== undefined && candidate.budgetMin > candidate.budgetMax) put('budgetMax', 'rfqWizard:step3.budgetRangeError');
  return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} };
};

export default function Step3Terms({ detail, goTo, registerSaver }: StepProps) {
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const { rfq } = detail;
  const update = useUpdateRfqDraft(rfq.id);
  const [busy, setBusy] = useState<'draft' | 'next' | null>(null);
  const terms = rfq.terms;

  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitted },
    trigger,
  } = useForm<Step3Form>({
    resolver: step3Resolver,
    defaultValues: {
      vatIncluded: terms.vatIncluded,
      paymentTerms: terms.paymentTerms,
      minValidityDays: String(terms.minValidityDays),
      sampleRequired: terms.sampleRequired,
      sampleQuantity: terms.sampleQuantity ? String(terms.sampleQuantity) : '',
      sampleNote: terms.sampleNote,
      requiredCertifications: terms.requiredCertifications,
      weights: { ...terms.weights },
      notesToSuppliers: terms.notesToSuppliers,
      budgetMin: rfq.budgetMin !== undefined ? String(rfq.budgetMin) : '',
      budgetMax: rfq.budgetMax !== undefined ? String(rfq.budgetMax) : '',
    },
  });
  const values = watch();

  const set = <K extends keyof Step3Form>(key: K, value: Step3Form[K]) => {
    setValue(key, value as never, { shouldDirty: true });
    if (isSubmitted) void trigger();
  };

  const toPatch = (v: Step3Form, completedStep?: number): RfqDraftPatch => {
    const c = toCandidate(v);
    const validity = Number.isFinite(c.minValidityDays) && c.minValidityDays > 0 ? c.minValidityDays : terms.minValidityDays;
    return {
      terms: {
        vatIncluded: c.vatIncluded,
        paymentTerms: c.paymentTerms,
        minValidityDays: validity,
        sampleRequired: c.sampleRequired,
        sampleQuantity: c.sampleQuantity,
        sampleNote: c.sampleNote,
        requiredCertifications: c.requiredCertifications,
        weights: c.weights,
        notesToSuppliers: c.notesToSuppliers,
      },
      budgetMin: c.budgetMin,
      budgetMax: c.budgetMax,
      ...(completedStep !== undefined && { completedStep }),
    };
  };

  const saveSilently = () => update.mutateAsync(toPatch(getValues()));
  useRegisterSaver(registerSaver, saveSilently);
  useAutosave(JSON.stringify(values), saveSilently);

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
        await update.mutateAsync(toPatch(v, Math.max(rfq.completedStep, 3)));
        registerSaver(null);
        goTo(4);
      } catch (e) {
        toast(errorText(e), 'error');
      } finally {
        setBusy(null);
      }
    },
    () => toast(t('validation.fixErrors'), 'error'),
  );

  const total = weightsTotal(values.weights);
  const weightsOk = total === 100;
  const paymentOptions: string[] = [...PAYMENT_TERM_OPTIONS];
  if (values.paymentTerms && !paymentOptions.includes(values.paymentTerms)) paymentOptions.unshift(values.paymentTerms);
  const validityOptions = VALIDITY_DAYS.includes(Number(values.minValidityDays)) ? VALIDITY_DAYS : [...VALIDITY_DAYS, Number(values.minValidityDays)].sort((a, b) => a - b);
  const certOptions: string[] = [...CERTIFICATION_OPTIONS, ...values.requiredCertifications.filter((c) => !(CERTIFICATION_OPTIONS as readonly string[]).includes(c))];
  const suppliers = invitedSuppliers(detail);

  const setWeight = (key: keyof EvaluationWeights, raw: number) => {
    const n = Math.max(0, Math.min(100, Math.round(Number.isFinite(raw) ? raw : 0)));
    set('weights', { ...getValues('weights'), [key]: n });
  };
  const toggleCert = (c: string) => {
    const current = getValues('requiredCertifications');
    set('requiredCertifications', current.includes(c) ? current.filter((x) => x !== c) : [...current, c]);
  };

  const main = (
    <>
      <SectionCard icon="payments" title={t('step3.commercialTitle')}>
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-1.5 text-label-md text-on-surface">{t('step3.vat')}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[false, true].map((included) => {
                const active = values.vatIncluded === included;
                return (
                  <label
                    key={String(included)}
                    className={clsx(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      active ? 'border-primary bg-primary-fixed/20 ring-1 ring-primary' : 'border-outline-variant hover:bg-surface-container-low',
                    )}
                  >
                    <input type="radio" name="vatIncluded" checked={active} onChange={() => set('vatIncluded', included)} className="mt-0.5 h-4 w-4 shrink-0 border-outline text-primary focus:ring-primary" />
                    <span className="flex flex-col">
                      <span className="text-label-lg text-on-surface">{included ? t('step3.vatIncluded') : t('step3.vatExcluded')}</span>
                      <span className="text-body-sm text-on-surface-variant">{included ? t('step3.vatIncludedHint') : t('step3.vatExcludedHint')}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('step3.currency')} htmlFor="rfq-currency">
              <Input id="rfq-currency" value={t('step3.currencyValue')} disabled readOnly suffix={<Icon name="lock" size={16} />} />
            </Field>
            <Field label={t('step3.validity')} htmlFor="rfq-validity" error={errors.minValidityDays?.message}>
              <Select id="rfq-validity" {...register('minValidityDays')}>
                {validityOptions.map((d) => (
                  <option key={d} value={d}>
                    {t('step3.validityOption', { count: d })}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t('step3.paymentTerms')} htmlFor="rfq-payment" error={errors.paymentTerms?.message}>
            <Select id="rfq-payment" {...register('paymentTerms')} invalid={Boolean(errors.paymentTerms)}>
              {paymentOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Callout tone="warning" icon="info">
            <strong className="font-semibold text-warning">{t('step3.paymentNoticeTitle')}</strong> {t('step3.paymentNotice')}
          </Callout>
        </div>
      </SectionCard>

      <SectionCard icon="science" title={t('step3.sampleTitle')} aside={values.sampleRequired ? <Badge tone="info">{t('step3.sampleBadge')}</Badge> : undefined}>
        <div className="rounded-lg border border-outline-variant bg-surface-container-low/60 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface-variant">
              <Icon name="inventory_2" size={20} />
            </span>
            <Switch className="flex-1" checked={values.sampleRequired} onChange={(v) => set('sampleRequired', v)} label={t('step3.sampleSwitch')} description={t('step3.sampleSwitchHint')} />
          </div>
          {values.sampleRequired && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('step3.sampleQuantity')} required htmlFor="rfq-sample-qty" error={errors.sampleQuantity?.message}>
                <Input id="rfq-sample-qty" type="number" min={1} leftIcon="format_list_numbered" suffix={rfq.unit} {...register('sampleQuantity')} invalid={Boolean(errors.sampleQuantity)} />
              </Field>
              <Field label={t('step3.sampleNote')} htmlFor="rfq-sample-note">
                <Input id="rfq-sample-note" leftIcon="schedule" {...register('sampleNote')} placeholder={t('step3.sampleNotePlaceholder')} />
              </Field>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard icon="verified" title={t('step3.certTitle')} subtitle={t('step3.certSubtitle')}>
        <div className="flex flex-wrap gap-2">
          {certOptions.map((c) => {
            const on = values.requiredCertifications.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCert(c)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label-md transition-colors',
                  on ? 'border-primary bg-primary-fixed/30 text-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container-low',
                )}
              >
                <Icon name={on ? 'check_circle' : 'add'} size={16} />
                {c}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon="tune"
        title={t('step3.weightsTitle')}
        subtitle={t('step3.weightsSubtitle')}
        aside={
          <Badge tone={weightsOk ? 'success' : 'danger'} icon={weightsOk ? 'check' : 'error'}>
            {weightsOk ? t('step3.weightsValid', { total }) : t('step3.weightsInvalid', { total })}
          </Badge>
        }
      >
        <div className="flex flex-col gap-3">
          {WEIGHT_KEYS.map((key, i) => (
            <div key={key} className="rounded-lg border border-outline-variant bg-surface-container-low/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`weight-${key}`} className="text-label-md text-on-surface">
                  {i + 1}. {t(`step3.weights.${key}`)} <span className="font-normal text-on-surface-variant">({t(`step3.weights.${key}Hint`)})</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id={`weight-${key}`}
                    type="number"
                    min={0}
                    max={100}
                    value={values.weights[key]}
                    onChange={(e) => setWeight(key, e.target.valueAsNumber)}
                    className="w-20"
                    inputClassName="text-center tabular-nums"
                  />
                  <span className="text-label-md text-on-surface-variant">%</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={values.weights[key]}
                onChange={(e) => setWeight(key, e.target.valueAsNumber)}
                aria-label={t(`step3.weights.${key}`)}
                className="mt-2 w-full accent-primary"
              />
            </div>
          ))}
          {!weightsOk && (
            <p className="flex items-center gap-1 text-body-sm text-danger" role="alert">
              <Icon name="error" size={14} />
              {t('common:validation.weightsTotal')}
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard icon="account_balance_wallet" title={t('step3.budgetTitle')}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md text-on-surface">{t('step3.budgetRange')}</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              {(['budgetMin', 'budgetMax'] as const).map((name) => (
                <Field key={name} error={errors[name]?.message}>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <MoneyInput
                        ref={field.ref}
                        name={field.name}
                        value={parseOptionalNumber(field.value)}
                        onChange={(v) => field.onChange(v === undefined ? '' : String(v))}
                        onBlur={field.onBlur}
                        prefix="₫"
                        placeholder={t(`step3.${name}`)}
                        aria-label={t(`step3.${name}`)}
                        invalid={Boolean(errors[name])}
                      />
                    )}
                  />
                </Field>
              ))}
              <p className="flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-body-sm text-on-surface-variant">
                <Icon name="lock" size={16} />
                {t('step3.budgetHidden')}
              </p>
            </div>
          </div>
          <Field label={t('step3.notes')} htmlFor="rfq-notes" hint={t('step3.notesHint')}>
            <Textarea id="rfq-notes" rows={4} {...register('notesToSuppliers')} placeholder={t('step3.notesPlaceholder')} />
          </Field>
        </div>
      </SectionCard>
    </>
  );

  const aside = (
    <>
      <Card padding="md">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-label-lg text-on-surface">
            <Icon name="group" size={20} className="text-primary" />
            {t('suppliersCard.title')}
          </h2>
          <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed-variant">
            {suppliers.length} / {MAX_SUPPLIERS_PER_RFQ}
          </span>
        </div>
        <p className="mb-3 text-body-sm text-on-surface-variant">{t('step3.suppliersHint')}</p>
        <ul className="flex flex-col gap-2">
          {suppliers.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 rounded-lg border border-outline-variant p-2.5">
              <Avatar initials={s.initials} size="sm" square tone="primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-md text-on-surface">{s.name}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-success">
                  {s.certifications[0] && <Icon name="check_circle" size={12} />}
                  <span className="truncate">{[s.certifications[0], t(`common:provinces.${s.province}`)].filter(Boolean).join(' · ')}</span>
                </p>
              </div>
              <span className="whitespace-nowrap text-label-md text-on-surface-variant">★ {s.rating.toFixed(1)}</span>
            </li>
          ))}
          {suppliers.length === 0 && <li className="rounded-lg bg-surface-container-low p-3 text-center text-body-sm text-on-surface-variant">{t('suppliersCard.none')}</li>}
        </ul>
        <Button variant="link" className="mt-3 w-full justify-center" onClick={() => goTo(2)}>
          {t('step3.editSuppliers')}
        </Button>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 flex items-center gap-2 border-b border-outline-variant pb-3 text-label-lg text-on-surface">
          <Icon name="assignment_turned_in" size={20} className="text-primary" />
          {t('step3.summaryTitle')}
        </h2>
        <div className="flex flex-col gap-2.5">
          <SummaryRow label={t('step3.summary.payment')}>
            <span className="line-clamp-2">{values.paymentTerms}</span>
          </SummaryRow>
          <SummaryRow label={t('step3.summary.vat')}>{values.vatIncluded ? t('step3.vatIncludedShort') : t('step3.vatExcludedShort')}</SummaryRow>
          <SummaryRow label={t('step3.summary.sample')}>
            {values.sampleRequired ? t('step3.summary.sampleValue', { count: Number(values.sampleQuantity) || 0, unit: rfq.unit }) : t('step3.summary.noSample')}
          </SummaryRow>
          <SummaryRow label={t('step3.summary.validity')}>{t('common:time.days', { count: Number(values.minValidityDays) })}</SummaryRow>
          <SummaryRow label={t('step3.summary.budget')}>
            {parseOptionalNumber(values.budgetMax) !== undefined ? f.money(parseOptionalNumber(values.budgetMax)!) : '—'}
          </SummaryRow>
          <div className="border-t border-outline-variant/60 pt-2.5">
            <p className="mb-1.5 text-body-sm text-on-surface-variant">{t('step3.summary.certs')}</p>
            <div className="flex flex-wrap gap-1">
              {values.requiredCertifications.length ? values.requiredCertifications.map((c) => <Chip key={c}>{c}</Chip>) : <span className="text-body-sm text-on-surface-variant">{t('common:labels.none')}</span>}
            </div>
          </div>
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
        backLabel={t('footer.backTo', { step: 2 })}
        onBack={() => goTo(2)}
        nextLabel={t('footer.continueTo', { step: 4, name: t('steps.4') })}
        onNext={() => void next()}
        nextLoading={busy === 'next'}
      />
    </>
  );
}
