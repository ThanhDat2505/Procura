import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { Breadcrumbs, ButtonLink, Card, ErrorState, Icon, LoadingState } from '@/components/ui';
import { buyerKeys } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { api, type InvitationView } from '@/services';
import { resumeStep } from './wizardHelpers';

/** Same cache entry as `useRfq`, refreshed every 10 s so simulated supplier replies show up. */
function useLiveRfq(id: string) {
  return useQuery({ queryKey: buyerKeys.rfq(id), queryFn: () => api.rfqs.get(id), refetchInterval: 10_000, refetchOnMount: 'always' });
}

type InvitationState = 'quoted' | 'viewed' | 'declined' | 'sent';

function invitationState(inv: InvitationView): InvitationState {
  if (inv.quotation) return 'quoted';
  if (inv.declinedAt) return 'declined';
  if (inv.viewedAt) return 'viewed';
  return 'sent';
}

const pillTone: Record<InvitationState, string> = {
  sent: 'border-[#BFDBFE] bg-[#EFF6FF] text-primary',
  viewed: 'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed-variant',
  quoted: 'border-success-border bg-success-container text-success',
  declined: 'border-outline-variant bg-surface-container text-on-surface-variant',
};

/** BUY-06e — confirmation after an RFQ is published. */
export default function RfqSentPage() {
  const { rfqId = '' } = useParams();
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const query = useLiveRfq(rfqId);

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <LoadingState />;
  const { rfq, invitations } = query.data;
  // Right after publishing, the cache may still hold the draft until the refetch lands.
  if (rfq.lifecycle === 'draft' && query.isFetching) return <LoadingState />;
  if (rfq.lifecycle === 'draft') return <Navigate to={`/buyer/rfqs/${rfq.id}/edit/${resumeStep(rfq.completedStep)}`} replace />;

  const steps = [
    { n: 1, tag: t('sent.next.1.tag'), title: t('sent.next.1.title'), body: t('sent.next.1.body'), footIcon: 'timelapse', foot: t('sent.next.1.foot'), active: true },
    { n: 2, tag: t('sent.next.2.tag'), title: t('sent.next.2.title'), body: t('sent.next.2.body'), footIcon: 'lock', foot: t('sent.next.2.foot') },
    { n: 3, tag: t('sent.next.3.tag'), title: t('sent.next.3.title'), body: t('sent.next.3.body', { deadline: f.dateTime(rfq.deadline) }), footIcon: 'auto_awesome', foot: t('sent.next.3.foot') },
    { n: 4, tag: t('sent.next.4.tag'), title: t('sent.next.4.title'), body: t('sent.next.4.body'), footIcon: 'check_circle', foot: t('sent.next.4.foot'), highlight: true },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumbs items={[{ label: t('breadcrumb.list'), to: '/buyer/rfqs' }, { label: rfq.code, to: `/buyer/rfqs/${rfq.id}` }, { label: t('sent.breadcrumb') }]} />
        {rfq.sentAt && (
          <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
            <Icon name="schedule" size={14} />
            {f.dateTime(rfq.sentAt)}
          </span>
        )}
      </div>

      <Card padding="lg" className="flex flex-col items-center px-4 text-center sm:px-10 sm:py-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-success-border bg-success-container text-success">
          <Icon name="check" size={34} />
        </span>
        <h1 className="mt-5 text-headline-lg text-on-surface sm:text-display-sm">{t('sent.title', { code: rfq.code })}</h1>
        <p className="mt-2 max-w-xl text-body-lg text-on-surface-variant">
          {t('sent.sentencePrefix')} <strong className="text-on-surface">{rfq.title || rfq.productName}</strong> {t('sent.sentenceMiddle')}{' '}
          <strong className="text-on-surface">{t('sent.supplierCount', { count: invitations.length })}</strong>.
        </p>
        <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 text-body-md text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {t('sent.codeLabel')} <strong className="text-on-surface">{rfq.code}</strong>
          </span>
          <span className="hidden text-outline-variant sm:inline" aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="event" size={16} />
            {t('sent.deadlineLabel')} <strong className="tabular-nums text-on-surface">{f.dateTime(rfq.deadline)}</strong>
          </span>
        </div>

        <section className="mt-8 w-full rounded-xl border border-outline-variant bg-surface-container-low/60 p-3 text-left sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="flex items-center gap-2 text-label-md uppercase tracking-wide text-on-surface">
              <Icon name="forward_to_inbox" size={18} className="text-primary" />
              {t('sent.listTitle')}
            </h2>
            <span className="text-body-sm text-on-surface-variant">{t('sent.forwarded', { count: invitations.length })}</span>
          </div>
          <ol className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            {invitations.map((inv, i) => {
              const state = invitationState(inv);
              return (
                <li key={inv.supplier.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-fixed text-label-md tabular-nums text-on-primary-fixed-variant">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label-lg text-on-surface">{inv.supplier.name}</p>
                    <p className="truncate text-body-sm text-on-surface-variant">
                      {inv.supplier.locationLabel}
                      {inv.supplier.verified && ` · ${t('sent.verified')}`}
                      {inv.supplier.certifications[0] && ` ${inv.supplier.certifications[0]}`}
                    </p>
                  </div>
                  <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-label-sm', pillTone[state])}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    {t(`sent.state.${state}`)}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 flex items-center gap-1 px-1 text-body-sm text-on-surface-variant">
            <Icon name="sync" size={14} />
            {t('sent.liveHint')}
          </p>
        </section>

        <section className="mt-8 w-full text-left">
          <h2 className="mb-3 flex items-center gap-2 text-label-md uppercase tracking-wide text-on-surface">
            <Icon name="timeline" size={18} className="text-primary" />
            {t('sent.nextTitle')}
          </h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className={clsx('flex flex-col rounded-xl border p-3.5', s.active ? 'border-primary/40 bg-primary-fixed/20' : 'border-outline-variant bg-surface-container-lowest')}>
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full text-label-sm', s.active || s.highlight ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface')}>{s.n}</span>
                  <span className={clsx('text-label-sm', s.active || s.highlight ? 'text-primary' : 'text-on-surface-variant')}>{s.tag}</span>
                </div>
                <p className="mt-2 text-label-lg text-on-surface">{s.title}</p>
                <p className="mt-1 flex-1 text-body-sm text-on-surface-variant">{s.body}</p>
                <p className={clsx('mt-3 flex items-center gap-1 border-t border-outline-variant pt-2 text-label-sm', s.highlight ? 'text-primary' : 'text-on-surface-variant')}>
                  <Icon name={s.footIcon} size={14} />
                  {s.foot}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink to={`/buyer/rfqs/${rfq.id}`} size="lg" leftIcon="visibility">
            {t('sent.viewProgress')}
          </ButtonLink>
          <ButtonLink to="/buyer" variant="secondary" size="lg" leftIcon="arrow_back">
            {t('sent.backHome')}
          </ButtonLink>
        </div>
        <ButtonLink to="/buyer/rfqs/new" variant="link" leftIcon="add_circle" className="mt-4">
          {t('sent.createAnother')}
        </ButtonLink>
      </Card>

      <Card padding="md" className="flex items-start gap-3">
        <Icon name="info" size={20} className="mt-0.5 text-primary" />
        <div>
          <p className="text-label-lg text-on-surface">{t('sent.tipTitle')}</p>
          <p className="mt-0.5 text-body-md text-on-surface-variant">{t('sent.tipBody')}</p>
        </div>
      </Card>
    </div>
  );
}
