import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LoadingState,
  PageHeader,
  Pagination,
  PillTabs,
  QuotationStatusBadge,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui';
import { clock } from '@/domain/clock';
import { canEditQuotation, canWithdrawQuotation } from '@/domain/quotation';
import { useMyQuotations, useWithdrawQuotation } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import type { QuotationTab, SupplierQuotationItem } from '@/services';
import { downloadCsv, toCsv } from './csv';
import { inTimeRange, TIME_RANGES, validityState, winRate, type TimeRange } from './quotationView';

const TABS: QuotationTab[] = ['all', 'pending', 'awarded', 'not_selected', 'closed'];
const PAGE_SIZE = 10;

/** SUP-03 — Quản lý Báo giá đã gửi. */
export default function QuotationsPage() {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const toast = useToast();
  const [tab, setTab] = useState<QuotationTab>('all');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [buyerId, setBuyerId] = useState('all');
  const [withdrawTarget, setWithdrawTarget] = useState<SupplierQuotationItem | null>(null);

  const list = useMyQuotations({ tab, page, pageSize: PAGE_SIZE });
  const withdraw = useWithdrawQuotation();
  const data = list.data;

  const buyers = useMemo(() => {
    const map = new Map<string, string>();
    data?.items.forEach((i) => map.set(i.buyer.id, i.buyer.shortName));
    return [...map.entries()];
  }, [data]);

  const rows = useMemo(() => {
    const now = clock.now();
    return (data?.items ?? []).filter((i) => (buyerId === 'all' || i.buyer.id === buyerId) && inTimeRange(i.quotation.submittedAt, timeRange, now));
  }, [data, buyerId, timeRange]);

  const filtersActive = timeRange !== 'all' || buyerId !== 'all';

  const changeTab = (next: QuotationTab) => {
    setTab(next);
    setPage(1);
  };

  const exportCsv = () => {
    const now = clock.now();
    const csv = toCsv([
      [t('csv.code'), t('csv.submittedAt'), t('csv.rfq'), t('csv.title'), t('csv.buyer'), t('csv.unitPrice'), t('csv.total'), t('csv.leadTime'), t('csv.validUntil'), t('csv.status')],
      ...rows.map((i) => [
        i.quotation.code,
        i.quotation.submittedAt ? f.dateTime(i.quotation.submittedAt) : '',
        i.rfq.code,
        i.rfq.title,
        i.buyer.name,
        i.quotation.unitPrice,
        i.total,
        i.quotation.leadTimeDays,
        f.date(validityState(i.quotation, now).until),
        t(`quotationStatus.${i.quotation.status}`, { ns: 'common' }),
      ]),
    ]);
    const name = `bao-gia-da-gui-${tab}-p${page}.csv`;
    downloadCsv(name, csv);
    toast(t('toast.exported', { ns: 'common', name }), 'success');
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      await withdraw.mutateAsync(withdrawTarget.quotation.id);
      toast(t('withdraw.success', { code: withdrawTarget.quotation.code }), 'success');
      setWithdrawTarget(null);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(t(code ?? 'errors.generic', { ns: 'common', defaultValue: t('errors.generic', { ns: 'common' }) }), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <Button variant="secondary" leftIcon="file_download" onClick={exportCsv} disabled={rows.length === 0}>
              {t('actions.export')}
            </Button>
            <Button variant="secondary" leftIcon="tune" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
              {t('actions.advancedFilter')}
            </Button>
          </>
        }
      />

      {list.isLoading ? (
        <LoadingState rows={6} />
      ) : list.isError || !data ? (
        <Card>
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t('stats.submitted')}
              value={data.stats.submitted}
              unit={t('stats.files')}
              icon="send"
              footer={
                <span className="flex items-center gap-1">
                  <span className="flex items-center font-semibold text-primary">
                    <Icon name="arrow_upward" size={14} />+{data.stats.submittedLast30Days}
                  </span>
                  {t('stats.last30Days')}
                </span>
              }
            />
            <StatCard
              label={t('stats.pending')}
              value={data.stats.pending}
              valueClassName="text-warning"
              unit={t('stats.packages')}
              icon="hourglass_top"
              iconTone="warning"
              footer={
                <span className="flex items-center gap-1 text-warning">
                  <Icon name="info" size={14} />
                  {t('stats.pendingFooter')}
                </span>
              }
            />
            <StatCard
              label={t('stats.awarded')}
              value={data.stats.awarded}
              valueClassName="text-success"
              unit={t('stats.packages')}
              icon="workspace_premium"
              iconTone="success"
              footer={<span className="text-success">{t('stats.winRate', { rate: f.percent(winRate(data.stats.awarded, data.stats.submitted), 1) })}</span>}
            />
            <StatCard
              label={t('stats.notSelected')}
              value={data.stats.notSelected}
              valueClassName="text-on-surface-variant"
              unit={t('stats.packages')}
              icon="cancel"
              iconTone="neutral"
              footer={t('stats.notSelectedFooter')}
            />
          </section>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PillTabs ariaLabel={t('tabs.ariaLabel')} value={tab} onChange={changeTab} items={TABS.map((value) => ({ value, label: t(`tabs.${value}`), count: data.counts[value] }))} />
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="qt-time">
                  {t('filters.time')}
                </label>
                <Select id="qt-time" compact className="w-48" value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
                  {TIME_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {t(`filters.timeOptions.${r}`)}
                    </option>
                  ))}
                </Select>
                <label className="sr-only" htmlFor="qt-buyer">
                  {t('filters.buyer')}
                </label>
                <Select id="qt-buyer" compact className="w-56" value={buyerId} onChange={(e) => setBuyerId(e.target.value)}>
                  <option value="all">{t('filters.buyerAll')}</option>
                  {buyers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
                {filtersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon="close"
                    onClick={() => {
                      setTimeRange('all');
                      setBuyerId('all');
                    }}
                  >
                    {t('actions.reset', { ns: 'common' })}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Card padding="none" className="overflow-hidden">
            {rows.length === 0 ? (
              <EmptyState
                icon={filtersActive ? 'filter_alt_off' : 'request_quote'}
                title={filtersActive ? t('states.noResults', { ns: 'common' }) : t(`empty.${tab}.title`)}
                description={filtersActive ? t('empty.filtered') : t(`empty.${tab}.description`)}
                action={
                  !filtersActive && tab === 'all' ? (
                    <ButtonLink to="/supplier/inbox" leftIcon="inbox">
                      {t('empty.toInbox')}
                    </ButtonLink>
                  ) : undefined
                }
              />
            ) : (
              <Table minWidth={1180}>
                <THead>
                  <tr>
                    <Th>{t('table.code')}</Th>
                    <Th>{t('table.rfq')}</Th>
                    <Th className="text-right">{t('table.unitPrice')}</Th>
                    <Th className="text-right">{t('table.total')}</Th>
                    <Th className="text-center">{t('table.leadTime')}</Th>
                    <Th>{t('table.validity')}</Th>
                    <Th className="text-center">{t('table.status')}</Th>
                    <Th className="text-right">{t('table.actions')}</Th>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((item) => (
                    <QuotationRow key={item.quotation.id} item={item} onWithdraw={() => setWithdrawTarget(item)} />
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-xl border border-primary-fixed-dim bg-surface-container-lowest p-4">
            <Icon name="tips_and_updates" size={22} className="mt-0.5 text-primary" />
            <p className="text-body-sm leading-relaxed text-on-surface-variant">
              <strong className="font-semibold text-on-surface">{t('rules.title')}</strong> {t('rules.body')}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={withdrawTarget !== null}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={() => void confirmWithdraw()}
        title={t('withdraw.title')}
        description={withdrawTarget ? t('withdraw.description', { code: withdrawTarget.quotation.code, rfq: withdrawTarget.rfq.code }) : undefined}
        confirmLabel={t('withdraw.confirm')}
        tone="danger"
        loading={withdraw.isPending}
      >
        <Callout tone="warning">{t('withdraw.body')}</Callout>
      </ConfirmDialog>
    </>
  );
}

function QuotationRow({ item, onWithdraw }: { item: SupplierQuotationItem; onWithdraw: () => void }) {
  const { t } = useTranslation('quotations');
  const f = useFormat();
  const toast = useToast();
  const { quotation: q, rfq, buyer, total } = item;
  const now = clock.now();
  const validity = validityState(q, now);
  const muted = q.status === 'withdrawn' || q.status === 'expired';
  const canEdit = canEditQuotation(q, rfq, now);
  const canWithdraw = canWithdrawQuotation(q, rfq, now);
  const submittedAt = q.submittedAt ?? q.createdAt;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(q.code);
      toast(t('toast.copied', { ns: 'common' }), 'success');
    } catch {
      toast(t('errors.generic', { ns: 'common' }), 'error');
    }
  };

  return (
    <Tr className={clsx(muted && 'opacity-75')}>
      <Td className="whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Link to={`/supplier/quotations/${q.id}`} className={clsx('text-label-lg tabular-nums hover:underline', muted ? 'text-outline' : 'text-primary')}>
            {q.code}
          </Link>
          <IconButton icon="content_copy" size={16} label={t('table.copyCode', { code: q.code })} onClick={() => void copy()} className="p-1" />
        </div>
        <span className="mt-0.5 flex items-center gap-1 text-body-sm tabular-nums text-outline">
          <Icon name="schedule" size={13} />
          {f.time(submittedAt)} · {f.date(submittedAt)}
        </span>
      </Td>
      <Td className="min-w-[240px] max-w-[320px]">
        <Link to={`/supplier/quotations/${q.id}`} className="line-clamp-1 text-label-md text-on-surface hover:text-primary" title={rfq.title}>
          {rfq.title}
        </Link>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-body-sm text-on-surface-variant">
          <span className={clsx('shrink-0 font-medium tabular-nums', muted ? 'text-outline' : 'text-primary')}>{rfq.code}</span>
          <span aria-hidden>·</span>
          <span className="truncate" title={buyer.name}>
            {buyer.shortName}
          </span>
        </p>
      </Td>
      <Td className="whitespace-nowrap text-right">
        <span className="font-semibold tabular-nums text-on-surface">{f.money(q.unitPrice)}</span>
        <span className="block text-body-sm text-outline">/ {rfq.unit}</span>
      </Td>
      <Td className="whitespace-nowrap text-right">
        <span className={clsx('text-headline-sm tabular-nums', muted ? 'text-on-surface' : 'text-primary')}>{f.money(total)}</span>
        <span className="block text-label-sm font-normal text-outline">{t('labels.vatExcluded', { ns: 'common' })}</span>
      </Td>
      <Td className="whitespace-nowrap text-center">
        <span className="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 text-label-md text-on-surface">
          <Icon name="local_shipping" size={14} className="text-outline" />
          {t('time.days', { ns: 'common', count: q.leadTimeDays })}
        </span>
      </Td>
      <Td className="whitespace-nowrap">
        {q.status === 'withdrawn' ? (
          <>
            <p className="font-medium text-outline">{t('table.withdrawnBySupplier')}</p>
            <span className="text-label-sm font-normal text-outline">{t('table.withdrawnOn', { date: f.date(q.updatedAt) })}</span>
          </>
        ) : (
          <>
            <p className="font-medium tabular-nums text-on-surface">{t('table.validUntil', { date: f.date(validity.until) })}</p>
            {validity.expired ? (
              <span className="text-label-sm font-normal text-outline">{t('table.expired')}</span>
            ) : (
              <span className="rounded bg-primary-fixed px-1.5 text-label-sm text-primary">{t('table.daysLeft', { count: validity.daysLeft })}</span>
            )}
          </>
        )}
      </Td>
      <Td className="whitespace-nowrap text-center">
        <QuotationStatusBadge status={q.status} />
      </Td>
      <Td className="whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <ButtonLink to={`/supplier/quotations/${q.id}`} variant="secondary" size="sm" leftIcon="description">
            {t('actions.view')}
          </ButtonLink>
          {canEdit && (
            <ButtonLink to={`/supplier/inbox/${rfq.id}`} variant="ghost" size="sm" leftIcon="edit">
              {t('actions.edit')}
            </ButtonLink>
          )}
          {canWithdraw && (
            <Button variant="ghost" size="sm" leftIcon="undo" className="text-danger hover:bg-danger-container hover:text-danger" onClick={onWithdraw}>
              {t('actions.withdraw')}
            </Button>
          )}
        </div>
      </Td>
    </Tr>
  );
}
