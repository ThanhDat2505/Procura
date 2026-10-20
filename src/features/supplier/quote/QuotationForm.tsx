import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  AttachmentRow,
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  ConfirmDialog,
  Field,
  FileDropzone,
  Icon,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { addDays, clock } from '@/domain/clock';
import { quotationFormSchema, quotationTotal, VALIDITY_OPTIONS, vndToWords, type QuotationFormValues } from '@/domain/quotation';
import type { Attachment } from '@/domain/types';
import { useSaveQuotationDraft, useSubmitQuotation } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import type { SupplierRfqView } from '@/services';
import { addWorkingDays, defaultFormValues, draftPayload, moqCheck, paymentTermOptions, type QuotationFormInput, type QuoteModeInfo } from './quoteForm';

const NUMBER_FIELDS = ['unitPrice', 'moq', 'leadTimeDays'] as const;
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-label-md uppercase tracking-wider text-primary">
      <Icon name={icon} size={16} />
      {children}
    </h3>
  );
}

/** Right column of SUP-02/04: "Biểu mẫu gửi báo giá chính thức". */
export function QuotationForm({ view, modeInfo }: { view: SupplierRfqView; modeInfo: QuoteModeInfo }) {
  const { t } = useTranslation('quote');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const { rfq, quotation, priceHint } = view;
  const readOnly = modeInfo.mode === 'readOnly';
  const now = clock.now();

  const saveDraft = useSaveQuotationDraft(rfq.id);
  const submit = useSubmitQuotation(rfq.id);
  const [pending, setPending] = useState<QuotationFormValues | null>(null);
  const [files, setFiles] = useState<Attachment[]>(quotation?.attachments ?? []);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<QuotationFormInput, unknown, QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: defaultFormValues(rfq, quotation),
    mode: 'onTouched',
  });

  const [unitPrice, moq, leadTimeDays] = useWatch({ control, name: ['unitPrice', 'moq', 'leadTimeDays'] });
  const price = isNum(unitPrice) ? unitPrice : 0;
  const moqValue = isNum(moq) ? moq : 0;
  const total = quotationTotal(price, rfq.quantity, moqValue);
  const billedQty = Math.max(rfq.quantity, moqValue);
  const moqState = moqCheck(isNum(moq) ? moq : undefined, rfq.quantity);
  const delivery = isNum(leadTimeDays) && leadTimeDays > 0 ? addWorkingDays(now, leadTimeDays) : undefined;
  const termOptions = useMemo(() => paymentTermOptions(rfq.terms.paymentTerms, quotation?.paymentTerms), [rfq.terms.paymentTerms, quotation?.paymentTerms]);

  /** Empty number fields read better as "required" than "please enter a number". */
  const numberError = (name: (typeof NUMBER_FIELDS)[number]) => {
    const message = errors[name]?.message;
    if (!message) return undefined;
    return isNum(getValues(name)) ? message : 'validation.required';
  };

  const errorText = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    return t(code ?? 'errors.generic', { ns: 'common', defaultValue: t('errors.generic', { ns: 'common' }) });
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync(draftPayload(getValues()));
      toast(t('toast.draftSaved', { ns: 'common' }), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };

  const onConfirmSubmit = async () => {
    if (!pending) return;
    try {
      const saved = await submit.mutateAsync(pending);
      toast(modeInfo.mode === 'editingSubmitted' ? t('toast.resubmitted', { code: rfq.code }) : t('toast.submitted', { code: rfq.code }), 'success');
      setPending(null);
      navigate(`/supplier/quotations/${saved.id}`);
    } catch (e) {
      setPending(null);
      toast(errorText(e), 'error');
    }
  };

  const statusLabel = !quotation || quotation.status === 'draft' ? t('form.statusDraft') : t(`quotationStatus.${quotation.status}`, { ns: 'common' });

  return (
    <Card as="section" padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
        <div className="min-w-0">
          <h2 className="text-headline-md text-on-surface">{t('form.title')}</h2>
          <p className="text-body-sm text-on-surface-variant">{t('form.subtitle')}</p>
        </div>
        <Badge tone={readOnly ? 'neutral' : 'info'}>{t('form.statusChip', { status: statusLabel })}</Badge>
      </div>

      {modeInfo.mode === 'editingSubmitted' && (
        <Callout tone="info" icon="edit_document" title={t('form.editingTitle')}>
          {t('form.editingBody', { date: f.dateTime(rfq.deadline) })}
        </Callout>
      )}
      {readOnly && (
        <Callout tone="warning" icon="lock" title={t(`readOnly.${modeInfo.reason ?? 'closed'}.title`)}>
          <p>{t(`readOnly.${modeInfo.reason ?? 'closed'}.body`)}</p>
          {quotation && quotation.status !== 'draft' && (
            <ButtonLink to={`/supplier/quotations/${quotation.id}`} variant="link" rightIcon="arrow_forward" className="mt-1">
              {t('readOnly.viewQuotation')}
            </ButtonLink>
          )}
        </Callout>
      )}

      <form noValidate onSubmit={handleSubmit((values) => setPending(values))} className="flex flex-col gap-6">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-6">
          {/* 1. Pricing */}
          <div className="flex flex-col gap-4">
            <SectionTitle icon="calculate">{t('form.section1')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t('form.unitPrice', { unit: rfq.unit })}
                required
                htmlFor="q-unitPrice"
                error={numberError('unitPrice')}
                hint={priceHint && t('form.priceHint', { min: f.number(priceHint.min), max: f.money(priceHint.max) })}
              >
                <Input
                  id="q-unitPrice"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="any"
                  prefix="₫"
                  suffix={t('form.perUnit', { unit: rfq.unit })}
                  inputClassName="font-semibold tabular-nums"
                  invalid={Boolean(errors.unitPrice)}
                  {...register('unitPrice', { setValueAs: toNumber })}
                />
              </Field>
              <Field
                label={t('form.moq')}
                required
                htmlFor="q-moq"
                error={numberError('moq')}
                hint={
                  moqState === 'fits' ? (
                    <span className="flex items-center gap-1 font-medium text-success">
                      <Icon name="check_circle" size={14} />
                      {t('form.moqFits', { qty: f.number(rfq.quantity), unit: rfq.unit })}
                    </span>
                  ) : moqState === 'exceeds' ? (
                    <span className="flex items-center gap-1 font-medium text-warning">
                      <Icon name="warning" size={14} />
                      {t('form.moqExceeds', { qty: f.number(rfq.quantity), unit: rfq.unit })}
                    </span>
                  ) : (
                    t('form.moqHint', { qty: f.number(rfq.quantity), unit: rfq.unit })
                  )
                }
              >
                <Input
                  id="q-moq"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  suffix={rfq.unit}
                  inputClassName="tabular-nums"
                  invalid={Boolean(errors.moq)}
                  {...register('moq', { setValueAs: toNumber })}
                />
              </Field>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center" aria-live="polite">
              <div>
                <p className="text-label-md text-on-surface-variant">{t('form.totalLabel', { qty: f.number(billedQty), unit: rfq.unit })}</p>
                <p className="text-body-sm text-outline">{t('form.totalNote')}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-headline-lg font-bold tabular-nums text-primary">{f.money(total)}</p>
                {f.locale === 'vi' && total > 0 && <p className="text-label-sm font-normal text-on-surface-variant">{t('form.inWords', { words: vndToWords(total) })}</p>}
              </div>
            </div>
          </div>

          {/* 2. Production plan & terms */}
          <div className="flex flex-col gap-4 border-t border-outline-variant/60 pt-4">
            <SectionTitle icon="local_shipping">{t('form.section2')}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t('form.leadTime')}
                required
                htmlFor="q-leadTime"
                error={numberError('leadTimeDays')}
                hint={delivery ? t('form.expectedDelivery', { date: f.date(delivery) }) : t('form.leadTimeHint')}
              >
                <Input
                  id="q-leadTime"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  suffix={t('units.workingDays', { ns: 'common' })}
                  inputClassName="tabular-nums !pr-32"
                  invalid={Boolean(errors.leadTimeDays)}
                  {...register('leadTimeDays', { setValueAs: toNumber })}
                />
              </Field>
              <Field label={t('form.validity')} required htmlFor="q-validity" hint={t('form.validityHint', { min: rfq.terms.minValidityDays })}>
                <Select id="q-validity" {...register('validityDays', { valueAsNumber: true })}>
                  {VALIDITY_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {t('form.validityOption', { days, date: f.date(addDays(now, days)) })}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label={t('form.paymentTerms')} required htmlFor="q-payment" error={errors.paymentTerms?.message} hint={t('form.paymentHint')}>
              <Select id="q-payment" invalid={Boolean(errors.paymentTerms)} {...register('paymentTerms')}>
                {termOptions.map((term) => (
                  <option key={term} value={term}>
                    {term === rfq.terms.paymentTerms ? t('form.buyerTerm', { term }) : term}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t('form.toolingCost')} htmlFor="q-tooling" hint={t('form.toolingHint')} error={errors.toolingCost ? 'validation.number' : undefined}>
                <Input
                  id="q-tooling"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="any"
                  prefix="₫"
                  inputClassName="tabular-nums"
                  {...register('toolingCost', { setValueAs: (v) => toNumber(v) ?? 0 })}
                />
              </Field>
            </div>

            <Field label={t('form.offerNotes')} htmlFor="q-offer" hint={t('form.offerHint')}>
              <Textarea id="q-offer" rows={3} maxLength={1000} placeholder={t('form.offerPlaceholder')} className="resize-y" {...register('offerNotes')} />
            </Field>
          </div>

          {/* Attachments */}
          <div className="flex flex-col gap-2 border-t border-outline-variant/60 pt-4">
            <p className="text-label-md text-on-surface">{t('form.attachments')}</p>
            <FileDropzone
              title={t('form.dropTitle')}
              hint={t('form.dropHint')}
              maxSizeMb={15}
              accept=".pdf,.xlsx,.xls,.docx,.doc"
              onFiles={(added) => setFiles((prev) => [...prev, ...added])}
              onError={(key) => toast(t(key, { ns: 'common' }), 'error')}
            />
            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((file) => (
                  <li key={file.id}>
                    <AttachmentRow file={file} removeLabel={t('actions.remove', { ns: 'common' })} onRemove={readOnly ? undefined : () => setFiles((prev) => prev.filter((x) => x.id !== file.id))} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>

        {!readOnly && (
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:items-center">
            {modeInfo.mode === 'editingSubmitted' && quotation ? (
              <ButtonLink to={`/supplier/quotations/${quotation.id}`} variant="secondary" size="lg" leftIcon="close">
                {t('form.cancelEdit')}
              </ButtonLink>
            ) : (
              <Button variant="secondary" size="lg" leftIcon="save" onClick={() => void onSaveDraft()} loading={saveDraft.isPending}>
                {t('actions.saveDraft', { ns: 'common' })}
              </Button>
            )}
            <Button type="submit" size="lg" leftIcon="send" className="whitespace-normal">
              {modeInfo.mode === 'editingSubmitted' ? t('form.resubmit') : t('form.submit')}
            </Button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void onConfirmSubmit()}
        title={modeInfo.mode === 'editingSubmitted' ? t('confirm.titleResubmit') : t('confirm.title')}
        description={t('confirm.description', { code: rfq.code, buyer: view.buyer.name })}
        confirmLabel={t('confirm.confirm')}
        loading={submit.isPending}
      >
        {pending && (
          <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-md">
            <dt className="text-on-surface-variant">{t('confirm.unitPrice')}</dt>
            <dd className="text-right font-semibold tabular-nums text-on-surface">
              {f.money(pending.unitPrice)} / {rfq.unit}
            </dd>
            <dt className="text-on-surface-variant">{t('confirm.total')}</dt>
            <dd className="text-right font-bold tabular-nums text-primary">{f.money(quotationTotal(pending.unitPrice, rfq.quantity, pending.moq))}</dd>
            <dt className="text-on-surface-variant">{t('confirm.moq')}</dt>
            <dd className="text-right tabular-nums text-on-surface">
              {f.number(pending.moq)} {rfq.unit}
            </dd>
            <dt className="text-on-surface-variant">{t('confirm.leadTime')}</dt>
            <dd className="text-right tabular-nums text-on-surface">{t('time.workingDays', { ns: 'common', count: pending.leadTimeDays })}</dd>
            <dt className="text-on-surface-variant">{t('confirm.validity')}</dt>
            <dd className="text-right tabular-nums text-on-surface">{t('time.days', { ns: 'common', count: pending.validityDays })}</dd>
          </dl>
          <Callout tone="neutral" icon="lock">
            {t('confirm.sealed')}
          </Callout>
          </div>
        )}
      </ConfirmDialog>
    </Card>
  );
}
