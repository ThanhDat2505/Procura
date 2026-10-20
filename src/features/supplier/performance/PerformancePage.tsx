import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge, Button, Callout, Card, ErrorState, Icon, LoadingState, PageHeader, Select, useToast } from '@/components/ui';
import type { LossReason } from '@/domain/performance';
import type { PerformanceRecentResult, SupplierPerformanceView } from '@/services';
import { usePerformance } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { MonthlyBarChart, SERIES } from './MonthlyBarChart';
import { bestWinMonths, lossShares, parseMonth, recentStatus, toCsv, topLossReason } from './performanceHelpers';

const LOSS_COLORS: Record<LossReason, string> = {
  price: 'bg-danger',
  leadTime: 'bg-tertiary',
  moq: 'bg-secondary',
  other: 'bg-outline',
};

/** SUP-06 — Hiệu suất trúng thầu. */
export default function PerformancePage() {
  const { t } = useTranslation('performance');
  const perf = usePerformance();
  const data = perf.data;

  const months = data?.monthly ?? [];
  const first = months[0] ? parseMonth(months[0].month) : null;
  const last = months.length ? parseMonth(months[months.length - 1].month) : null;
  const periodLabel = first && last ? t('period', { count: months.length, from: first.month, to: last.month, year: last.year }) : '';

  return (
    <>
      <PageHeader
        title={t('title')}
        badge={<Badge tone="accent">{t('badge')}</Badge>}
        subtitle={t('subtitle')}
        actions={data && <HeaderActions data={data} periodLabel={periodLabel} />}
      />
      {perf.isError ? (
        <Card>
          <ErrorState error={perf.error} onRetry={() => void perf.refetch()} />
        </Card>
      ) : !data ? (
        <LoadingState rows={5} />
      ) : (
        <PerformanceContent data={data} />
      )}
    </>
  );
}

function HeaderActions({ data, periodLabel }: { data: SupplierPerformanceView; periodLabel: string }) {
  const { t } = useTranslation('performance');
  const f = useFormat();
  const toast = useToast();

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [t('title'), periodLabel],
      [],
      [t('csv.metric'), t('csv.value')],
      [t('kpi.received'), data.rfqsReceived],
      [t('kpi.submitted'), data.quotesSubmitted],
      [t('kpi.responseRateLabel'), f.percent(data.responseRate, 1)],
      [t('kpi.awarded'), data.awarded],
      [t('kpi.winRate'), f.percent(data.winRate, 1)],
      [t('kpi.avgResponse'), f.number(data.avgResponseHours, 1)],
      [],
      [t('chart.month'), t('chart.submitted'), t('chart.awarded')],
      ...data.monthly.map((m) => [t('chart.monthLong', parseMonth(m.month)), m.submitted, m.awarded]),
      [],
      [t('loss.title'), t('csv.count'), t('csv.share')],
      ...lossShares(data.lossReasons).map((r) => [t(`loss.reason.${r.key}`), r.count, f.percent(r.share)]),
    ];
    const name = 'procura-hieu-suat-trung-thau.csv';
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('common:toast.exported', { name }));
  };

  return (
    <>
      <Select aria-label={t('periodAria')} className="min-w-[240px]" value="all" onChange={() => undefined}>
        <option value="all">{periodLabel}</option>
      </Select>
      <Button variant="secondary" leftIcon="download" onClick={exportCsv}>
        {t('export')}
      </Button>
    </>
  );
}

function Kpi({ label, icon, iconClass, value, unit, footer, highlight, valueClass }: { label: string; icon: string; iconClass: string; value: ReactNode; unit?: string; footer?: ReactNode; highlight?: boolean; valueClass?: string }) {
  return (
    <div className={clsx('card flex flex-col justify-between p-4', highlight && 'ring-1 ring-primary/25')}>
      <div className="mb-2 flex items-start justify-between gap-2 text-on-surface-variant">
        <span className="text-label-md font-medium">{label}</span>
        <Icon name={icon} filled={highlight} className={iconClass} />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className={clsx('text-display-sm tabular-nums', valueClass ?? 'text-on-surface')}>{value}</span>
        {unit && <span className="text-label-md font-medium text-on-surface-variant">{unit}</span>}
      </p>
      {footer && <div className="mt-2 text-label-sm">{footer}</div>}
    </div>
  );
}

function PerformanceContent({ data }: { data: SupplierPerformanceView }) {
  const { t } = useTranslation('performance');
  const f = useFormat();
  const best = bestWinMonths(data.monthly);
  const shares = lossShares(data.lossReasons);
  const top = topLossReason(data.lossReasons);
  const first = data.monthly[0] ? parseMonth(data.monthly[0].month) : null;
  const last = data.monthly.length ? parseMonth(data.monthly[data.monthly.length - 1].month) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label={t('kpi.received')}
          icon="inventory_2"
          iconClass="text-tertiary"
          value={f.number(data.rfqsReceived)}
          unit={t('unit.package')}
          footer={<span className="text-on-surface-variant">{t('kpi.receivedNote')}</span>}
        />
        <Kpi
          label={t('kpi.submitted')}
          icon="send_time_extension"
          iconClass="text-primary"
          value={f.number(data.quotesSubmitted)}
          unit={t('unit.package')}
          footer={<span className="font-semibold text-primary">{t('kpi.responseRate', { value: f.percent(data.responseRate, 1) })}</span>}
        />
        <Kpi
          label={t('kpi.awarded')}
          icon="military_tech"
          iconClass="text-primary"
          highlight
          valueClass="text-primary"
          value={f.number(data.awarded)}
          unit={t('unit.package')}
          footer={
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/60 px-2 py-0.5 font-semibold text-on-primary-fixed">
              <Icon name="check_circle" size={14} />
              {t('kpi.awardedChip')}
            </span>
          }
        />
        <Kpi
          label={t('kpi.winRate')}
          icon="query_stats"
          iconClass="text-tertiary"
          value={f.number(data.winRate * 100, 1)}
          unit="%"
          footer={<span className="text-on-surface-variant">{t('kpi.winRateNote', { awarded: data.awarded, submitted: data.quotesSubmitted })}</span>}
        />
        <Kpi
          label={t('kpi.avgResponse')}
          icon="bolt"
          iconClass="text-secondary"
          value={f.number(data.avgResponseHours, 1)}
          unit={t('common:units.hours')}
          footer={<span className="text-on-surface-variant">{t('kpi.avgResponseNote')}</span>}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card padding="md">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">{t('chart.title')}</h2>
                {first && last && <p className="text-body-sm text-on-surface-variant">{t('chart.subtitle', { from: first.month, to: last.month, year: last.year })}</p>}
              </div>
              <ul className="flex items-center gap-3" aria-label={t('chart.legend')}>
                <li className="flex items-center gap-1.5">
                  <span className={clsx('h-3 w-3 rounded-sm', SERIES.submitted)} aria-hidden />
                  <span className="text-label-sm text-on-surface-variant">{t('chart.submitted')}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={clsx('h-3 w-3 rounded-sm', SERIES.awarded)} aria-hidden />
                  <span className="text-label-sm text-on-surface">{t('chart.awarded')}</span>
                </li>
              </ul>
            </div>
            <MonthlyBarChart monthly={data.monthly} />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 text-label-sm text-on-surface-variant">
              <span>{t('chart.unit')}</span>
              {best && (
                <span className="flex items-center gap-1 text-tertiary">
                  <Icon name="trending_up" size={15} />
                  {t('chart.best', {
                    months: best.months.map((m) => parseMonth(m).month).join(' & '),
                    rate: f.percent(best.rate),
                    count: best.months.length,
                  })}
                </span>
              )}
            </div>
          </Card>

          <Card padding="md">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">{t('loss.title')}</h2>
                <p className="text-body-sm text-on-surface-variant">{t('loss.subtitle', { count: data.notSelected, months: data.monthly.length })}</p>
              </div>
              <Icon name="pie_chart" size={22} className="text-outline" />
            </div>
            {data.notSelected === 0 ? (
              <p className="rounded-lg bg-surface-container-low p-4 text-center text-body-md text-on-surface-variant">{t('loss.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {shares.map((r) => (
                  <li key={r.key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-label-md font-medium text-on-surface">
                        <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', LOSS_COLORS[r.key])} aria-hidden />
                        {t(`loss.reason.${r.key}`)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-label-sm text-on-surface-variant">{t('loss.count', { count: r.count })}</span>
                        <span className="w-10 text-right text-label-md tabular-nums text-on-surface">{f.percent(r.share)}</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container" role="presentation">
                      <div className={clsx('h-full rounded-full', LOSS_COLORS[r.key])} style={{ width: `${r.share * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {top && (
              <Callout tone="info" icon="tips_and_updates" title={t('loss.tipTitle')} className="mt-4">
                {t(`loss.tip.${top}`)}
              </Callout>
            )}
          </Card>
        </div>

        <Card padding="md" className="lg:col-span-5">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-outline-variant/70 pb-3">
            <div>
              <h2 className="text-headline-sm text-on-surface">{t('recent.title')}</h2>
              <p className="text-body-sm text-on-surface-variant">{t('recent.subtitle')}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant" title={t('recent.anonymousHint')}>
              <Icon name="lock" size={15} />
              {t('recent.anonymous')}
            </span>
          </div>
          {data.recent.length === 0 ? (
            <p className="py-6 text-center text-body-md text-on-surface-variant">{t('recent.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {data.recent.map((r) => (
                <RecentItem key={r.quotation.id} item={r} />
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/60 pt-3 text-label-sm text-on-surface-variant">
            <span>{t('recent.showing', { shown: data.recent.length, total: data.quotesSubmitted })}</span>
            <Link to="/supplier/quotations" className="flex items-center gap-0.5 font-semibold text-primary hover:underline">
              {t('recent.viewAll')}
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecentItem({ item }: { item: PerformanceRecentResult }) {
  const { t } = useTranslation('performance');
  const f = useFormat();
  const status = recentStatus(item.quotation.status);
  const won = status === 'awarded';
  const { rank, of } = item.priceRank;

  return (
    <li className={clsx('flex flex-col gap-2.5 rounded-lg border p-3.5 transition-colors', won ? 'border-primary/30 bg-primary-fixed/15 hover:border-primary' : 'border-outline-variant/80 bg-surface-container-low/30 hover:border-primary/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Link to={`/supplier/quotations/${item.quotation.id}`} className={clsx('text-label-lg hover:underline', status === 'notSelected' ? 'text-on-surface' : 'text-primary')}>
              {item.rfq.code}
            </Link>
            <span className="text-body-sm text-on-surface-variant">
              ({f.number(item.rfq.quantity)} {item.rfq.unit})
            </span>
          </p>
          <p className="mt-0.5 truncate text-body-sm text-on-surface" title={item.rfq.title}>
            {item.rfq.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
            <Icon name="apartment" size={14} />
            {t('recent.buyer')} <strong className="font-semibold text-on-surface">{item.buyer.shortName}</strong>
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      <div className={clsx('flex flex-col gap-1.5 border-t pt-2', won ? 'border-primary/20' : 'border-outline-variant/50')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="text-label-sm text-on-surface-variant">{t('recent.rankLabel')}</span>
            <span className={clsx('rounded px-2 py-0.5 text-label-md tabular-nums', won ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface')}>
              {t('recent.rank', { rank, of })}
            </span>
          </span>
          <span className={clsx('text-label-sm', status === 'comparing' ? 'italic text-on-surface-variant' : won ? 'font-semibold text-primary' : 'text-outline')}>
            {status === 'comparing' ? t('recent.noteComparing') : won ? (rank === 1 ? t('recent.noteBestPrice') : t('recent.noteAwarded')) : t('recent.noteClosed')}
          </span>
        </div>
        {status === 'notSelected' && item.quotation.buyerFeedback && (
          <p className="rounded border border-outline-variant/50 bg-surface-container-low p-2 text-body-sm text-on-surface-variant">
            <strong className="font-semibold text-on-surface">{t('recent.feedback')}</strong> {item.quotation.buyerFeedback}
          </p>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof recentStatus> }) {
  const { t } = useTranslation('performance');
  if (status === 'awarded') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-label-sm text-on-primary shadow-sm">
        <Icon name="check" size={13} />
        {t('recent.status.awarded')}
      </span>
    );
  }
  if (status === 'comparing') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-secondary/30 bg-secondary-fixed px-2.5 py-0.5 text-label-sm text-on-secondary-fixed">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" aria-hidden />
        {t('recent.status.comparing')}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-surface-container-highest px-2.5 py-0.5 text-label-sm text-on-surface-variant">
      {t(`recent.status.${status}`)}
    </span>
  );
}
