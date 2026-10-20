import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Avatar, Breadcrumbs, Button, ButtonLink, Card, Chip, ConfirmDialog, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import { canEditQuotation, canWithdrawQuotation, quotationTotal, quotationValidUntil } from '@/domain/quotation';
import { isPastDeadline } from '@/domain/rfq';
import type { Quotation, Rfq } from '@/domain/types';
import { useMyQuotation, useSupplierProfile, useWithdrawQuotation } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import type { SupplierQuotationDetail } from '@/services';
import { progressSteps, type StepState } from './quotationView';

/** SUP-04b — Báo giá đã gửi – Chi tiết. */
export default function QuotationDetailPage() {
  const { quotationId = '' } = useParams();
  const { t } = useTranslation('quotations');
  const detail = useMyQuotation(quotationId);

  if (detail.isLoading) return <LoadingState rows={6} />;
  if (detail.isError || !detail.data) {
    return (
      <Card>
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        <div className="flex justify-center pb-6">
          <ButtonLink to="/supplier/quotations" variant="link" leftIcon="arrow_back">
            {t('detail.backToList')}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const data = detail.data;
  const { quotation: q, rfq } = data;

  return (
    <>
      <Breadcrumbs
        className="mb-4"
        items={[{ label: t('detail.crumbList'), to: '/supplier/quotations' }, { label: t('detail.crumb', { code: q.code, rfq: rfq.code }) }]}
      />
      <h1 className="sr-only">{t('detail.crumb', { code: q.code, rfq: rfq.code })}</h1>
      <div className="flex flex-col gap-6">
        <StatusBanner quotation={q} rfq={rfq} buyerName={data.buyer.shortName} />
        <ProgressCard quotation={q} rfq={rfq} />
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <RfqInfoCard data={data} />
            <QuotationCard data={data} />
          </div>
          <div className="flex flex-col gap-6">
            <ActionsCard quotation={q} rfq={rfq} />
            <ContactCard data={data} />
            <SupportCard />
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function StatusBanner({ quotation: q, rfq, buyerName }: { quotation: Quotation; rfq: Rfq; buyerName: string }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const now = clock.now();
  const at = q.submittedAt ?? q.createdAt;

  type Tone = 'success' | 'neutral' | 'danger' | 'info';
  let tone: Tone = 'success';
  let icon = 'check_circle';
  let title: ReactNode;
  let body: ReactNode;
  let aside: ReactNode = null;

  switch (q.status) {
    case 'submitted':
    case 'viewed': {
      title = t('banner.sent', { rfq: rfq.code, time: f.time(at), date: f.date(at) });
      body = t('banner.sentBody');
      const open = rfq.lifecycle === 'open' && !isPastDeadline(rfq, now);
      aside = (
        <div className="shrink-0 rounded-lg border border-success-border bg-surface-container-lowest px-3.5 py-1.5 text-left sm:text-right">
          <p className="text-label-sm font-normal text-outline">{t('banner.editWindow')}</p>
          <p className={clsx('flex items-center gap-1 text-label-md sm:justify-end', open ? 'text-danger' : 'text-on-surface-variant')}>
            <Icon name="timer" size={15} />
            {open ? t('banner.editDeadline', { date: f.dateTime(rfq.deadline) }) : t('banner.editClosed')}
          </p>
        </div>
      );
      break;
    }
    case 'awarded':
      icon = 'workspace_premium';
      title = t('banner.awarded');
      body = t('banner.awardedBody', { buyer: buyerName, rfq: rfq.code, date: f.date(q.decidedAt ?? rfq.awardedAt ?? q.updatedAt) });
      break;
    case 'not_selected':
      tone = 'neutral';
      icon = 'info';
      title = t('banner.notSelected', { rfq: rfq.code });
      body = q.buyerFeedback ? t('banner.feedback', { text: q.buyerFeedback }) : t('banner.notSelectedBody');
      break;
    case 'withdrawn':
      tone = 'danger';
      icon = 'undo';
      title = t('banner.withdrawn');
      body = t('banner.withdrawnBody', { date: f.date(q.updatedAt) });
      break;
    case 'expired':
      tone = 'neutral';
      icon = 'history';
      title = t('banner.expired');
      body = t('banner.expiredBody');
      break;
    default:
      tone = 'info';
      icon = 'edit_note';
      title = t('banner.draft');
      body = t('banner.draftBody');
      aside = (
        <ButtonLink to={`/supplier/inbox/${rfq.id}`} size="sm" leftIcon="edit">
          {t('actions.continueDraft')}
        </ButtonLink>
      );
  }

  const styles: Record<Tone, { box: string; circle: string; title: string; body: string }> = {
    success: { box: 'border-success-border bg-success-container', circle: 'bg-[#DCFCE7] text-success', title: 'text-[#166534]', body: 'text-[#15803D]' },
    neutral: { box: 'border-outline-variant bg-surface-container-low', circle: 'bg-surface-container-high text-on-surface-variant', title: 'text-on-surface', body: 'text-on-surface-variant' },
    danger: { box: 'border-danger-border bg-danger-container', circle: 'bg-[#FEE2E2] text-danger', title: 'text-[#991B1B]', body: 'text-[#B91C1C]' },
    info: { box: 'border-primary-fixed-dim bg-primary-fixed/40', circle: 'bg-primary-fixed text-primary', title: 'text-on-surface', body: 'text-on-surface-variant' },
  };
  const s = styles[tone];

  return (
    <section className={clsx('flex flex-col items-start justify-between gap-3 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center', s.box)} role="status">
      <div className="flex min-w-0 items-center gap-3">
        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', s.circle)}>
          <Icon name={icon} size={22} filled />
        </span>
        <div className="min-w-0">
          <p className={clsx('text-label-lg', s.title)}>{title}</p>
          <p className={clsx('text-body-sm', s.body)}>{body}</p>
        </div>
      </div>
      {aside}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

function ProgressCard({ quotation: q, rfq }: { quotation: Quotation; rfq: Rfq }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const states = progressSteps(q);
  const decided = q.status === 'awarded' || q.status === 'not_selected';
  const submittedAt = q.submittedAt ?? q.createdAt;

  const steps: { title: string; state: StepState; line1: string; line2: string; resultTone?: 'success' | 'neutral' }[] = [
    {
      title: t('progress.step1'),
      state: states[0],
      line1: states[0] === 'done' ? t('progress.doneOn', { date: f.dayMonth(submittedAt) }) : t('progress.drafting'),
      line2: states[0] === 'done' ? t('progress.at', { time: f.time(submittedAt) }) : '',
    },
    {
      title: t('progress.step2'),
      state: states[1],
      line1: states[1] === 'done' ? t('progress.doneOn', { date: f.dayMonth(q.viewedAt ?? submittedAt) }) : states[1] === 'active' ? t('progress.waitingView') : t('progress.notStarted'),
      line2: states[1] === 'done' ? t('progress.verified') : states[1] === 'active' ? t('progress.notifyOnView') : '',
    },
    {
      title: t('progress.step3'),
      state: states[2],
      line1: states[2] === 'done' ? t('progress.done') : states[2] === 'active' ? t('progress.inProgress') : t('progress.notStarted'),
      line2: t('progress.openingAt', { time: f.time(rfq.deadline), date: f.dayMonth(rfq.deadline) }),
    },
    {
      title: t('progress.step4'),
      state: states[3],
      line1: decided ? t(`quotationStatus.${q.status}`, { ns: 'common' }) : t('progress.expectedAfter', { date: f.dayMonth(rfq.deadline) }),
      line2: decided && q.decidedAt ? t('progress.announcedOn', { date: f.date(q.decidedAt) }) : t('progress.notifyChannel'),
      resultTone: q.status === 'awarded' ? 'success' : q.status === 'not_selected' ? 'neutral' : undefined,
    },
  ];

  return (
    <Card>
      <h2 className="mb-4 text-label-sm uppercase tracking-wider text-outline">{t('progress.title')}</h2>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={i} className={clsx('flex items-start gap-3', step.state === 'pending' && 'opacity-60')} aria-current={step.state === 'active' ? 'step' : undefined}>
            <span
              className={clsx(
                'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                step.state === 'done' && (step.resultTone === 'neutral' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-[#DCFCE7] text-success'),
                step.state === 'active' && 'bg-primary-fixed text-primary',
                step.state === 'pending' && 'bg-surface-container text-outline',
              )}
            >
              <Icon name={step.state === 'done' ? (step.resultTone === 'neutral' ? 'remove' : 'check') : step.state === 'active' ? 'sync' : 'hourglass_empty'} size={18} filled={step.state === 'done'} />
              {step.state === 'active' && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className={clsx('text-label-md', step.state === 'active' ? 'font-bold text-primary' : 'text-on-surface')}>{step.title}</p>
              <p
                className={clsx(
                  'text-body-sm font-medium',
                  step.state === 'done' && step.resultTone !== 'neutral' && 'text-success',
                  step.state === 'done' && step.resultTone === 'neutral' && 'text-on-surface-variant',
                  step.state === 'active' && 'text-primary',
                  step.state === 'pending' && 'text-outline',
                )}
              >
                {step.line1}
              </p>
              {step.line2 && <p className="text-label-sm font-normal text-outline">{step.line2}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RFQ & quotation details
// ---------------------------------------------------------------------------

function RfqInfoCard({ data }: { data: SupplierQuotationDetail }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const { rfq, buyer } = data;
  return (
    <Card padding="lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-2">
          <Icon name="assignment" size={22} className="text-primary" />
          <h2 className="text-headline-sm text-on-surface">{t('detail.rfqTitle')}</h2>
        </div>
        <span className="rounded-full border border-primary-fixed bg-[#EEF2FF] px-2.5 py-0.5 text-label-sm text-primary">{rfq.code}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3.5">
          <p className="mb-1 text-label-sm font-normal text-outline">{t('detail.buyer')}</p>
          <p className="flex items-start gap-2 text-label-lg text-on-surface">
            <span>{buyer.name}</span>
            <Icon name="verified" size={16} filled className="mt-0.5 text-success" />
          </p>
          <p className="mt-0.5 text-body-sm text-outline">{t('detail.taxCode', { code: buyer.taxCode })}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3.5">
          <p className="mb-1 text-label-sm font-normal text-outline">{t('detail.product')}</p>
          <p className="text-label-lg text-on-surface">{rfq.productName}</p>
          <p className="mt-0.5 text-body-sm font-semibold text-primary">{t('detail.quantity', { qty: f.number(rfq.quantity), unit: rfq.unit })}</p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3.5 md:col-span-2">
          <Icon name="local_shipping" className="mt-0.5 text-outline" />
          <div className="min-w-0">
            <p className="text-label-sm font-normal text-outline">{t('detail.delivery')}</p>
            <p className="mt-0.5 text-label-md text-on-surface">{rfq.deliveryAddress}</p>
            <p className="mt-0.5 text-body-sm text-outline">{t('detail.neededBy', { date: f.date(rfq.neededBy) })}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KvRow({ label, children, last }: { label: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div className={clsx('grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]', !last && 'border-b border-outline-variant')}>
      <dt className="bg-surface-container-low px-4 py-3 text-label-md text-outline">{label}</dt>
      <dd className="px-4 py-3 text-body-md text-on-surface">{children}</dd>
    </div>
  );
}

function QuotationCard({ data }: { data: SupplierQuotationDetail }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const profile = useSupplierProfile();
  const { quotation: q, rfq } = data;
  const total = quotationTotal(q.unitPrice, rfq.quantity, q.moq);
  const committedQty = Math.max(rfq.quantity, q.moq);
  const validUntil = quotationValidUntil(q);
  const note = q.technicalNotes ?? q.offerNotes;
  const rows: { label: string; value: ReactNode }[] = [
    { label: t('detail.moq'), value: <span className="font-semibold tabular-nums">{`${f.number(q.moq)} ${rfq.unit}`}</span> },
    { label: t('detail.leadTime'), value: <span className="font-semibold text-primary">{t('detail.leadTimeValue', { days: String(q.leadTimeDays).padStart(2, '0') })}</span> },
    { label: t('detail.validity'), value: t('detail.validityValue', { days: q.validityDays, date: f.date(validUntil) }) },
    {
      label: t('detail.samplePolicy'),
      value: q.samplePolicy ? (
        <span className="inline-flex items-start gap-1.5 font-medium text-success">
          <Icon name="check_circle" size={16} className="mt-0.5" />
          {q.samplePolicy}
        </span>
      ) : (
        <span className="text-on-surface-variant">{t('detail.notSpecified')}</span>
      ),
    },
    { label: t('detail.paymentTerms'), value: q.paymentTerms },
  ];
  if (q.toolingCost > 0 || q.toolingNote) {
    rows.push({ label: t('detail.tooling'), value: q.toolingCost > 0 ? `${f.money(q.toolingCost)}${q.toolingNote ? ` · ${q.toolingNote}` : ''}` : q.toolingNote });
  }
  if (q.technicalNotes && q.offerNotes) rows.push({ label: t('detail.offerNotes'), value: q.offerNotes });
  rows.push({
    label: t('detail.certifications'),
    value: (
      <div className="flex flex-wrap items-center gap-2">
        {q.certifications.length ? q.certifications.map((c) => <Chip key={c} className="border border-outline-variant text-on-surface">{c}</Chip>) : <span className="text-on-surface-variant">{t('detail.notSpecified')}</span>}
        {q.attachments.length > 0 && (
          <span className="flex items-center gap-0.5 text-label-sm text-primary">
            <Icon name="attachment" size={14} />
            {t('detail.attachments', { count: q.attachments.length })}
          </span>
        )}
      </div>
    ),
  });

  return (
    <Card padding="lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="verified_user" size={22} className="text-primary" />
          <h2 className="text-headline-sm text-on-surface">{t('detail.quoteTitle', { supplier: profile.data?.shortName ?? '' })}</h2>
        </div>
        <span className="whitespace-nowrap rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">{t('detail.readOnly')}</span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <span className="text-label-sm uppercase tracking-wider text-outline">{t('detail.unitPrice')}</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-1">
            <span className="text-display-sm tabular-nums text-primary">{f.number(q.unitPrice)}</span>
            <span className="text-label-md text-primary">{t('detail.perUnit', { unit: rfq.unit })}</span>
          </div>
          <p className="mt-1 text-body-sm text-outline">{t('detail.vatNote')}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <span className="text-label-sm uppercase tracking-wider text-outline">{t('detail.total')}</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-1">
            <span className="text-display-sm tabular-nums text-on-surface">{f.number(total)}</span>
            <span className="text-label-md text-on-surface">{t('detail.currency')}</span>
          </div>
          <p className="mt-1 text-body-sm text-outline">{t('detail.committedQty', { qty: f.number(committedQty), unit: rfq.unit })}</p>
        </div>
      </div>

      <dl className="mb-6 overflow-hidden rounded-lg border border-outline-variant">
        {rows.map((r, i) => (
          <KvRow key={r.label} label={r.label} last={i === rows.length - 1}>
            {r.value}
          </KvRow>
        ))}
      </dl>

      {note && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div className="mb-1.5 flex items-center gap-2 text-outline">
            <Icon name="description" size={18} />
            <span className="text-label-md uppercase tracking-wider">{t('detail.technicalNotes')}</span>
          </div>
          <blockquote className="border-l-2 border-primary pl-4 text-body-md italic text-on-surface">“{note}”</blockquote>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column
// ---------------------------------------------------------------------------

function ActionsCard({ quotation: q, rfq }: { quotation: Quotation; rfq: Rfq }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const toast = useToast();
  const withdraw = useWithdrawQuotation();
  const [confirm, setConfirm] = useState(false);
  const now = clock.now();
  const canEdit = canEditQuotation(q, rfq, now);
  const canWithdraw = canWithdrawQuotation(q, rfq, now);

  const reason =
    q.status === 'withdrawn'
      ? t('actionsCard.lockedWithdrawn')
      : q.status === 'awarded' || q.status === 'not_selected'
        ? t('actionsCard.lockedDecided')
        : rfq.lifecycle !== 'open'
          ? t('actionsCard.lockedClosed')
          : t('actionsCard.lockedDeadline', { date: f.dateTime(rfq.deadline) });

  const doWithdraw = async () => {
    try {
      await withdraw.mutateAsync(q.id);
      toast(t('withdraw.success', { code: q.code }), 'success');
      setConfirm(false);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(t(code ?? 'errors.generic', { ns: 'common', defaultValue: t('errors.generic', { ns: 'common' }) }), 'error');
    }
  };

  return (
    <Card>
      <h2 className="mb-3 text-headline-sm text-on-surface">{t('actionsCard.title')}</h2>
      {canEdit || canWithdraw ? (
        <div className="flex flex-col gap-3">
          {canEdit && (
            <>
              <ButtonLink to={`/supplier/inbox/${rfq.id}`} size="lg" fullWidth leftIcon="edit_document">
                {t('actionsCard.edit')}
              </ButtonLink>
              <p className="-mt-1 text-center text-label-sm font-normal text-outline">{t('actionsCard.editUntil', { date: f.dateTime(rfq.deadline) })}</p>
            </>
          )}
          {canWithdraw && (
            <Button variant="danger" size="md" fullWidth leftIcon="cancel" className="h-10 border-danger" onClick={() => setConfirm(true)}>
              {t('actionsCard.withdraw')}
            </Button>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
          <Icon name="lock_clock" size={18} className="mt-px text-outline" />
          {reason}
        </p>
      )}
      <div className="mt-5 flex items-start gap-2.5 border-t border-outline-variant pt-4">
        <Icon name="lock" className="mt-0.5 text-primary" />
        <p className="text-body-sm leading-snug text-outline">
          {t('actionsCard.sealedBefore')} <strong className="font-semibold text-on-surface">{t('actionsCard.sealedName')}</strong>
          {t('actionsCard.sealedAfter')}
        </p>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void doWithdraw()}
        title={t('withdraw.title')}
        description={t('withdraw.description', { code: q.code, rfq: rfq.code })}
        confirmLabel={t('withdraw.confirm')}
        tone="danger"
        loading={withdraw.isPending}
      >
        <p className="text-body-md text-on-surface-variant">{t('withdraw.body')}</p>
      </ConfirmDialog>
    </Card>
  );
}

function ContactCard({ data }: { data: SupplierQuotationDetail }) {
  const { t } = useTranslation('quotations');
  const toast = useToast();
  const { buyerContact: c, buyer } = data;
  return (
    <Card>
      <h2 className="mb-3 text-headline-sm text-on-surface">{t('contact.title')}</h2>
      <div className="mb-4 flex items-center gap-3">
        <Avatar initials={c.initials} size="lg" />
        <div className="min-w-0">
          <p className="text-label-md text-on-surface">{c.name}</p>
          <p className="text-label-sm font-normal text-outline">{c.title}</p>
          <p className="mt-0.5 text-label-sm text-primary">{buyer.shortName}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 border-t border-outline-variant pt-3 text-body-sm">
        <li className="flex items-center gap-2 text-outline">
          <Icon name="mail" size={18} />
          <a href={`mailto:${c.email}`} className="truncate text-on-surface hover:text-primary hover:underline">
            {c.email}
          </a>
        </li>
        {c.phone && (
          <li className="flex items-center gap-2 text-outline">
            <Icon name="call" size={18} />
            <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="text-on-surface hover:text-primary hover:underline">
              {c.phone}
            </a>
          </li>
        )}
        <li className="flex items-center gap-2 text-outline">
          <Icon name="chat" size={18} />
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => toast(t('states.notSupported', { ns: 'common' }), 'info')}>
            {t('contact.message')}
          </button>
        </li>
      </ul>
    </Card>
  );
}

function SupportCard() {
  const { t } = useTranslation('quotations');
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <h2 className="mb-1 flex items-center gap-2 text-label-md text-primary">
        <Icon name="support_agent" size={18} />
        {t('support.title')}
      </h2>
      <p className="mb-3 text-body-sm text-outline">{t('support.body')}</p>
      <a href="mailto:support@procura.vn" className="inline-flex items-center gap-1 text-label-sm text-primary hover:underline">
        {t('support.link')}
        <Icon name="arrow_forward" size={14} />
      </a>
    </section>
  );
}
