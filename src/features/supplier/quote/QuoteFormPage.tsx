import clsx from 'clsx';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Breadcrumbs, ButtonLink, Card, ErrorState, Icon, LoadingState } from '@/components/ui';
import { clock } from '@/domain/clock';
import { deadlineInfo } from '@/domain/rfq';
import { usePortalRfq, useSupplierProfile } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import type { SupplierRfqView } from '@/services';
import { QuotationForm } from './QuotationForm';
import { quoteMode, type QuoteModeInfo } from './quoteForm';
import { RfqSummaryCard, TrustCard } from './RfqSummaryCard';

/** SUP-02/04 — Gửi báo giá (new quotation, draft, or editing a submitted one). */
export default function QuoteFormPage() {
  const { rfqId = '' } = useParams();
  const { t } = useTranslation('quote');
  const rfq = usePortalRfq(rfqId);

  if (rfq.isLoading) return <LoadingState rows={6} />;
  if (rfq.isError || !rfq.data) {
    return (
      <Card>
        <ErrorState error={rfq.error} onRetry={() => void rfq.refetch()} />
        <div className="flex justify-center pb-6">
          <ButtonLink to="/supplier/inbox" variant="link" leftIcon="arrow_back">
            {t('backToInbox')}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const view = rfq.data;
  const modeInfo = quoteMode(view, clock.now());

  return (
    <>
      <Breadcrumbs className="mb-4" items={[{ label: t('breadcrumb.inbox'), to: '/supplier/inbox' }, { label: `${view.rfq.code} (${view.buyer.shortName})` }]} />
      <div className="flex flex-col gap-5">
        <QuoteBanner view={view} modeInfo={modeInfo} />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <RfqSummaryCard view={view} />
            <TrustCard />
          </div>
          <div className="lg:col-span-7">
            <QuotationForm key={view.rfq.id} view={view} modeInfo={modeInfo} />
          </div>
        </div>
      </div>
    </>
  );
}

function QuoteBanner({ view, modeInfo }: { view: SupplierRfqView; modeInfo: QuoteModeInfo }) {
  const { t } = useTranslation('quote');
  const f = useFormat();
  const profile = useSupplierProfile();
  const { rfq, buyer } = view;
  const info = deadlineInfo(rfq.deadline, clock.now());
  const active = modeInfo.mode !== 'readOnly';
  const pill = modeInfo.mode === 'readOnly' ? t(`banner.pill.readOnly_${modeInfo.reason ?? 'closed'}`) : t(`banner.pill.${modeInfo.mode}`);
  const deadlineChip =
    info.urgency === 'overdue' ? t('banner.deadlineOver') : info.urgency === 'today' ? t('banner.deadlineToday') : t('banner.daysLeft', { count: info.daysLeft });

  return (
    <section
      className={clsx(
        'flex flex-col items-start justify-between gap-4 rounded-xl border p-4 shadow-sm md:flex-row md:items-center',
        active ? 'border-primary-fixed-dim bg-gradient-to-r from-[#EFF6FF] via-[#F0F5FF] to-[#E9F0FE]' : 'border-outline-variant bg-surface-container-low',
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span className={clsx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm', active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant')}>
          <Icon name={active ? 'mark_email_unread' : 'lock'} filled />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('rounded-full px-2 py-0.5 text-label-sm', active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant')}>{pill}</span>
            <span className="font-mono text-label-md text-on-surface-variant">#{rfq.code}</span>
            <span className="text-body-sm text-outline">• {t('banner.deadline', { date: f.date(rfq.deadline) })}</span>
          </div>
          <h1 className="mt-1 text-headline-sm text-on-surface">
            <Trans
              t={t}
              i18nKey={modeInfo.mode === 'new' ? 'banner.titleNew' : 'banner.titleOther'}
              values={{ code: rfq.code, buyer: buyer.name }}
              components={{ code: <span className="font-bold text-primary" />, buyer: <span className="font-bold" /> }}
            />
          </h1>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {modeInfo.mode === 'readOnly'
              ? t('banner.textReadOnly')
              : modeInfo.mode === 'editingSubmitted'
                ? t('banner.textEditing')
                : t('banner.textNew', { supplier: profile.data?.shortName ?? t('banner.yourFactory') })}
          </p>
        </div>
      </div>
      <span
        className={clsx(
          'inline-flex shrink-0 items-center gap-1.5 self-end whitespace-nowrap rounded-lg border px-3 py-1.5 text-label-sm md:self-center',
          info.urgency === 'overdue' ? 'border-outline-variant bg-surface-container text-on-surface-variant' : 'border-warning-border bg-warning-container text-warning',
        )}
      >
        <Icon name="schedule" size={16} />
        {deadlineChip}
      </span>
    </section>
  );
}
