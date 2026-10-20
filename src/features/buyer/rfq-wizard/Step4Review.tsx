import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AttachmentRow, Avatar, Badge, Button, Callout, Card, Checkbox, Chip, DeadlineBadge, Icon, ProgressBar, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import { canSend, readinessChecks, weightsTotal, type ReadinessCheck } from '@/domain/rfq';
import type { EvaluationWeights } from '@/domain/types';
import { useSendRfq, useUpdateRfqDraft } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { invitedSuppliers, MoqFitChip, SummaryRow, useErrorText, useRegisterSaver, WizardFooter, WizardLayout, type StepProps } from './parts';
import type { WizardStep } from './wizardHelpers';

const WEIGHT_ORDER: (keyof EvaluationWeights)[] = ['price', 'leadTime', 'quality', 'moq'];

function ReviewCard({ icon, title, onEdit, children }: { icon: string; title: ReactNode; onEdit: () => void; children: ReactNode }) {
  const { t } = useTranslation('rfqWizard');
  return (
    <Card padding="md" className="sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="flex items-start gap-2.5 text-headline-sm text-on-surface">
          <Icon name={icon} size={22} className="mt-px text-primary" />
          {title}
        </h2>
        <Button variant="link" leftIcon="edit" onClick={onEdit}>
          {t('common:actions.edit')}
        </Button>
      </div>
      {children}
    </Card>
  );
}

function SpecBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant p-3">
      <p className="text-body-sm text-on-surface-variant">{label}</p>
      <p className="mt-0.5 break-words text-label-lg text-on-surface">{value || '—'}</p>
    </div>
  );
}

export default function Step4Review({ detail, goTo, registerSaver, setPublishing }: StepProps) {
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const { rfq } = detail;
  const update = useUpdateRfqDraft(rfq.id);
  const send = useSendRfq();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Nothing is edited on this step, so there is nothing to save before leaving it.
  useRegisterSaver(registerSaver, async () => undefined);

  const now = clock.now();
  const checks = readinessChecks(rfq, now);
  const required = checks.filter((c) => c.key !== 'attachments');
  const done = required.filter((c) => c.ok).length;
  const ready = canSend(rfq, now);
  const suppliers = invitedSuppliers(detail);
  const edit = (step: WizardStep) => () => goTo(step);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({ completedStep: Math.max(rfq.completedStep, 3) });
      toast(t('common:toast.draftSaved'));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const sent = await send.mutateAsync(rfq.id);
      toast(t('step4.sentToast', { code: sent.code }));
      // The refreshed RFQ (now open) may already have redirected the page to BUY-06e; this covers the other order.
      navigate(`/buyer/rfqs/${sent.id}/sent`, { replace: true });
    } catch {
      setPublishing(false);
    }
  };

  const checkLabel = (c: ReadinessCheck) => t(`step4.checks.${c.key}`, { count: rfq.invitations.length });
  const unitCeiling = rfq.budgetMax !== undefined && rfq.quantity > 0 ? rfq.budgetMax / rfq.quantity : undefined;

  const main = (
    <>
      <ReviewCard icon="inventory_2" title={t('step4.specTitle')} onEdit={edit(1)}>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-surface-container-low p-4">
          <div className="min-w-0">
            <p className="text-body-sm text-on-surface-variant">{t('step4.productName')}</p>
            <p className="text-headline-sm text-on-surface">{rfq.productName || '—'}</p>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {t(`common:categories.${rfq.categoryId}`)}
              {rfq.subcategory && ` · ${rfq.subcategory}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-body-sm text-on-surface-variant">{t('step4.quantity')}</p>
            <p className="text-headline-md tabular-nums text-primary">
              {f.number(rfq.quantity)} {rfq.unit}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SpecBox label={t('step4.dimensions')} value={rfq.dimensions} />
          <SpecBox label={t('step4.material')} value={rfq.material} />
          <SpecBox label={t('step4.finishing')} value={rfq.finishing} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Icon name="location_on" size={18} className="mt-0.5 text-on-surface-variant" />
            <div>
              <p className="text-body-sm text-on-surface-variant">{t('step4.address')}</p>
              <p className="text-body-md text-on-surface">{rfq.deliveryAddress || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="timer" size={18} className="mt-0.5 text-warning" />
            <div>
              <p className="text-body-sm text-on-surface-variant">{t('step4.deadline')}</p>
              <p className="flex flex-wrap items-center gap-2 text-body-md font-semibold text-on-surface">
                {f.dateTime(rfq.deadline)}
                <DeadlineBadge deadline={rfq.deadline} />
              </p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('step4.neededBy', { date: f.date(rfq.neededBy) })}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-label-md text-on-surface">{t('step4.attachments', { count: rfq.attachments.length })}</p>
          {rfq.attachments.length ? rfq.attachments.map((a) => <AttachmentRow key={a.id} file={a} />) : <p className="text-body-sm text-on-surface-variant">{t('step4.noAttachments')}</p>}
        </div>
      </ReviewCard>

      <ReviewCard icon="factory" title={t('step4.suppliersTitle', { count: suppliers.length })} onEdit={edit(2)}>
        <Callout tone="info" icon="visibility_off" title={t('step2.sealedTitle')}>
          {t('step4.sealedNote')}
        </Callout>
        <ul className="mt-4 divide-y divide-outline-variant rounded-lg border border-outline-variant">
          {suppliers.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar initials={s.initials} size="md" square tone="primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-lg text-on-surface">{s.name}</p>
                <p className="flex flex-wrap items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icon name="star" filled size={14} className="text-[#F59E0B]" />
                  <span className="font-semibold text-[#B45309]">{s.rating.toFixed(1)}</span>
                  <span aria-hidden>•</span>
                  {s.verified ? t('step4.verified') : s.locationLabel}
                  {s.certifications[0] && ` · ${s.certifications[0]}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-body-sm text-on-surface-variant">{t('step4.moqStandard')}</p>
                <p className="whitespace-nowrap text-label-lg text-on-surface">
                  {f.number(s.moq)} {s.moqUnit}
                </p>
              </div>
              <MoqFitChip moq={s.moq} quantity={rfq.quantity} short />
            </li>
          ))}
          {suppliers.length === 0 && <li className="p-4 text-center text-body-sm text-danger">{t('common:validation.minSuppliers')}</li>}
        </ul>
      </ReviewCard>

      <ReviewCard icon="gavel" title={t('step4.termsTitle')} onEdit={edit(3)}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">{t('step4.financial')}</p>
            <SummaryRow label={t('step4.vatCurrency')}>{t('step4.vatCurrencyValue', { vat: rfq.terms.vatIncluded ? t('step3.vatIncludedShort') : t('step3.vatExcludedShort') })}</SummaryRow>
            <SummaryRow label={t('step4.validity')}>{t('step4.validityValue', { count: rfq.terms.minValidityDays })}</SummaryRow>
            <SummaryRow label={t('step4.payment')}>{rfq.terms.paymentTerms || '—'}</SummaryRow>
            <SummaryRow label={t('step4.sample')}>
              {rfq.terms.sampleRequired ? t('step4.sampleValue', { count: rfq.terms.sampleQuantity, unit: rfq.unit }) : t('step3.summary.noSample')}
            </SummaryRow>
            {rfq.terms.sampleRequired && rfq.terms.sampleNote && <p className="text-body-sm text-on-surface-variant">{rfq.terms.sampleNote}</p>}
            <p className="mt-2 text-label-sm uppercase tracking-wide text-on-surface-variant">{t('step4.certs')}</p>
            <div className="flex flex-wrap gap-1.5">
              {rfq.terms.requiredCertifications.length ? (
                rfq.terms.requiredCertifications.map((c) => (
                  <Chip key={c} icon="verified">
                    {c}
                  </Chip>
                ))
              ) : (
                <span className="text-body-sm text-on-surface-variant">{t('common:labels.none')}</span>
              )}
            </div>
            {rfq.terms.requiredCertifications.length > 0 && <p className="text-body-sm text-on-surface-variant">{t('step4.certsNote')}</p>}
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">{t('step4.weights')}</p>
              <Badge tone={weightsTotal(rfq.terms.weights) === 100 ? 'success' : 'danger'}>{t('step4.weightsTotal', { total: weightsTotal(rfq.terms.weights) })}</Badge>
            </div>
            {WEIGHT_ORDER.map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">{t(`step4.weightLabels.${k}`)}</span>
                  <span className="font-semibold tabular-nums text-on-surface">{rfq.terms.weights[k]}%</span>
                </div>
                <ProgressBar value={rfq.terms.weights[k] / 100} label={t(`step4.weightLabels.${k}`)} />
              </div>
            ))}
          </div>
        </div>
        {rfq.terms.notesToSuppliers && (
          <div className="mt-4 rounded-lg bg-surface-container-low p-3">
            <p className="text-label-md text-on-surface">{t('step3.notes')}</p>
            <p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">{rfq.terms.notesToSuppliers}</p>
          </div>
        )}
      </ReviewCard>

      <Card padding="md" className="border-primary/40 bg-primary-fixed/10">
        <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label={t('step4.confirm', { count: suppliers.length })} />
      </Card>
      {send.isError && (
        <Callout tone="danger" title={t('step4.sendFailed')}>
          {errorText(send.error)}
        </Callout>
      )}
    </>
  );

  const aside = (
    <>
      <Card padding="md">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <h2 className="text-headline-sm text-on-surface">{t('step4.readiness')}</h2>
          <Badge tone={ready ? 'success' : 'warning'}>{ready ? t('step4.ready', { pct: 100 }) : t('step4.notReady', { pct: Math.round((done / required.length) * 100) })}</Badge>
        </div>
        <ul className="flex flex-col gap-2.5">
          {checks.map((c) => {
            const advisory = c.key === 'attachments';
            return (
              <li key={c.key} className="flex items-start gap-2 text-body-md">
                <Icon
                  name={c.ok ? 'check_circle' : advisory ? 'info' : 'cancel'}
                  size={18}
                  className={clsx('mt-px', c.ok ? 'text-success' : advisory ? 'text-warning' : 'text-danger')}
                />
                <span className={clsx(c.ok ? 'text-on-surface' : advisory ? 'text-on-surface-variant' : 'text-danger')}>
                  {checkLabel(c)}
                  {advisory && <span className="ml-1 text-body-sm text-on-surface-variant">({t('step4.advisory')})</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-outline-variant pt-4">
          <ProgressBar value={done / required.length} tone={ready ? 'success' : 'warning'} label={t('step4.readiness')} />
          <p className="mt-2 text-right text-body-sm text-on-surface-variant">{t('step4.criteria', { done, total: required.length })}</p>
        </div>
      </Card>

      <Card padding="md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">{t('step4.budgetTitle')}</p>
            <p className="text-label-sm text-danger">{t('step4.budgetHidden')}</p>
          </div>
          <Icon name="lock" size={20} className="text-on-surface-variant" />
        </div>
        <p className="mt-3 text-headline-md tabular-nums text-on-surface">
          {rfq.budgetMin !== undefined || rfq.budgetMax !== undefined
            ? [rfq.budgetMin, rfq.budgetMax]
                .filter((v): v is number => v !== undefined)
                .map((v) => f.money(v))
                .join(' – ')
            : t('step4.noBudget')}
        </p>
        {unitCeiling !== undefined && (
          <p className="mt-2 inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface-variant">
            {t('step4.unitCeiling')}
            <strong className="tabular-nums text-on-surface">
              {f.money(unitCeiling)}/{rfq.unit}
            </strong>
          </p>
        )}
        <p className="mt-3 flex items-start gap-1.5 border-t border-outline-variant pt-3 text-body-sm text-on-surface-variant">
          <Icon name="info" size={16} />
          {t('step4.budgetNote')}
        </p>
      </Card>
    </>
  );

  return (
    <>
      <WizardLayout main={main} aside={aside} />
      <WizardFooter
        code={rfq.code}
        onSaveDraft={() => void saveDraft()}
        saving={saving}
        backLabel={t('footer.backTo', { step: 3 })}
        onBack={() => goTo(3)}
        nextLabel={t('step4.publish', { count: suppliers.length })}
        nextIcon="send"
        onNext={() => void publish()}
        nextLoading={send.isPending}
        nextDisabled={!ready || !confirmed}
      />
    </>
  );
}
