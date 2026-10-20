import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Chip,
  DeadlineBadge,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  RfqStatusBadge,
  StatCard,
  Table,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui';
import { clock } from '@/domain/clock';
import type { BuyerDashboard } from '@/services';
import { useBuyerDashboard } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { BookmarkToggle } from '../suppliers/components/SupplierCard';
import { useSupplierBookmark } from '../suppliers/components/useSupplierBookmark';
import { CATEGORY_ICONS } from '../suppliers/lib/categoryIcons';
import { dayPeriod, responseTimeParts } from './greeting';

/** BUY-01 — Tổng quan Người mua. */
export default function BuyerDashboardPage() {
  const { data, isPending, isError, error, refetch } = useBuyerDashboard();

  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <Greeting data={data} />
      <KpiRow stats={data.stats} />
      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <RecentRfqs items={data.recentRfqs} activeTotal={data.stats.activeRfqs} />
        <div className="flex flex-col gap-6 xl:col-span-4">
          <QuoteFeed quotes={data.recentQuotes} />
          <FeaturedSuppliers suppliers={data.featuredSuppliers} />
        </div>
      </section>
    </div>
  );
}

function Greeting({ data }: { data: BuyerDashboard }) {
  const { t } = useTranslation('buyerDashboard');
  const toast = useToast();
  const period = dayPeriod(clock.now().getHours());
  return (
    <Card as="section" className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-headline-lg text-on-surface">{t(`greeting.${period}`, { name: data.greetingName })}</h1>
          <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">{t('greeting.badge')}</span>
        </div>
        <p className="text-body-md text-on-surface-variant">
          <Trans
            t={t}
            i18nKey="greeting.summary"
            count={data.stats.quotesNewToday}
            values={{ rfqs: data.stats.activeRfqsDueSoon }}
            components={{ hl: <span className="font-semibold text-primary" /> }}
          />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" leftIcon="analytics" className="text-primary" onClick={() => toast(t('common:states.notSupported'), 'info')}>
          {t('greeting.weeklyReport')}
        </Button>
        <ButtonLink to="/buyer/rfqs/new" leftIcon="add_circle">
          {t('common:actions.createRfq')}
        </ButtonLink>
      </div>
    </Card>
  );
}

function KpiRow({ stats }: { stats: BuyerDashboard['stats'] }) {
  const { t } = useTranslation('buyerDashboard');
  const f = useFormat();
  const response = responseTimeParts(stats.avgResponseHours);
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('kpi.label')}>
      <StatCard
        label={t('kpi.activeRfqs')}
        icon="assignment"
        iconTone="primary"
        value={f.number(stats.activeRfqs)}
        badge={
          <span className={stats.activeRfqsDueSoon ? 'flex items-center gap-0.5 text-label-sm text-danger' : 'text-label-sm text-on-surface-variant'}>
            {stats.activeRfqsDueSoon > 0 && <Icon name="schedule" size={14} />}
            {t('kpi.dueSoon', { count: stats.activeRfqsDueSoon })}
          </span>
        }
        footer={t('kpi.activeRfqsHint')}
      />
      <StatCard
        label={t('kpi.quotesToReview')}
        icon="pending_actions"
        iconTone="warning"
        value={f.number(stats.quotesToReview)}
        badge={stats.quotesNewToday > 0 ? <Badge tone="danger">{t('kpi.newToday', { count: stats.quotesNewToday })}</Badge> : undefined}
        footer={t('kpi.quotesToReviewHint')}
      />
      <StatCard
        label={t('kpi.savings')}
        icon="trending_down"
        iconTone="success"
        value={f.percent(stats.savingsRate, 1)}
        badge={stats.savingsAmount > 0 ? <span className="text-label-sm text-success">~ {f.moneyCompact(stats.savingsAmount)}</span> : undefined}
        footer={t('kpi.savingsHint')}
      />
      <StatCard
        label={t('kpi.responseRate')}
        icon="speed"
        iconTone="primary"
        value={f.percent(stats.avgResponseRate)}
        badge={<span className="text-label-sm text-primary">{t(`kpi.avgResponse.${response.unit}`, { value: f.number(response.value, 1) })}</span>}
        footer={t('kpi.responseRateHint')}
      />
    </section>
  );
}

function RecentRfqs({ items, activeTotal }: { items: BuyerDashboard['recentRfqs']; activeTotal: number }) {
  const { t } = useTranslation('buyerDashboard');
  const f = useFormat();
  return (
    <Card padding="none" className="flex flex-col overflow-hidden xl:col-span-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container p-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">{t('rfqs.title')}</h2>
          <p className="text-body-sm text-outline">{t('rfqs.subtitle')}</p>
        </div>
        <ButtonLink to="/buyer/rfqs" variant="ghost" size="sm" className="text-primary hover:text-primary">
          {t('rfqs.viewAll')}
        </ButtonLink>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon="assignment"
          title={t('rfqs.empty')}
          description={t('rfqs.emptyHint')}
          action={
            <ButtonLink to="/buyer/rfqs/new" leftIcon="add_circle">
              {t('common:actions.createRfq')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <Table minWidth={600}>
            <THead>
              <tr>
                <Th>{t('rfqs.columns.rfq')}</Th>
                <Th className="hidden 2xl:table-cell">{t('common:labels.category')}</Th>
                <Th className="hidden 2xl:table-cell text-center">{t('rfqs.columns.invited')}</Th>
                <Th className="text-center">{t('rfqs.columns.quotes')}</Th>
                <Th>{t('common:labels.deadline')}</Th>
                <Th className="hidden 2xl:table-cell">{t('common:labels.status')}</Th>
                <Th className="bg-[#F8FAFC] text-right md:sticky md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">{t('common:labels.actions')}</Th>
              </tr>
            </THead>
            <tbody className="text-body-sm">
              {items.map(({ rfq, status, quoteCount, invitedCount }) => (
                <Tr key={rfq.id}>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/buyer/rfqs/${rfq.id}`} className="font-semibold text-on-surface hover:text-primary">
                        {rfq.code}
                      </Link>
                      <RfqStatusBadge status={status} className="2xl:hidden" />
                    </span>
                    <span className="block max-w-[220px] truncate text-outline" title={rfq.title}>
                      {rfq.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-on-surface-variant 2xl:hidden">{t(`common:categories.${rfq.categoryId}`)}</span>
                  </Td>
                  <Td className="hidden 2xl:table-cell">
                    <Chip>{t(`common:categories.${rfq.categoryId}`)}</Chip>
                  </Td>
                  <Td className="hidden 2xl:table-cell text-center tabular-nums">{invitedCount}</Td>
                  <Td className="whitespace-nowrap text-center tabular-nums">
                    <span className="font-bold text-tertiary">{quoteCount}</span>
                    <span className="text-outline">{t('rfqs.quotesOf', { count: invitedCount })}</span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="block tabular-nums text-on-surface">{f.date(rfq.deadline)}</span>
                    <DeadlineBadge deadline={rfq.deadline} className="mt-1" />
                  </Td>
                  <Td className="hidden 2xl:table-cell">
                    <RfqStatusBadge status={status} />
                  </Td>
                  <Td className="text-right md:sticky md:bg-surface-container-lowest md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">
                    {status === 'quoted' ? (
                      <ButtonLink to={`/buyer/rfqs/${rfq.id}/compare`} size="xs">
                        {t('rfqs.compareNow')}
                      </ButtonLink>
                    ) : (
                      <ButtonLink to={`/buyer/rfqs/${rfq.id}`} variant="secondary" size="xs">
                        {t('common:actions.viewDetail')}
                      </ButtonLink>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-outline">
            <span>{t('rfqs.footer', { shown: items.length, total: activeTotal })}</span>
            {activeTotal > items.length && (
              <Link to="/buyer/rfqs" className="flex items-center gap-0.5 font-semibold text-primary hover:underline">
                {t('common:actions.viewAll')}
                <Icon name="chevron_right" size={16} />
              </Link>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function QuoteFeed({ quotes }: { quotes: BuyerDashboard['recentQuotes'] }) {
  const { t } = useTranslation('buyerDashboard');
  const f = useFormat();
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <h2 className="text-headline-sm text-on-surface">{t('feed.title')}</h2>
        </div>
        <span className="text-label-sm text-outline">{t('feed.live')}</span>
      </div>
      {quotes.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-on-surface-variant">{t('feed.empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-surface-container">
          {quotes.map(({ quotation: q, supplier, rfqCode, rfqId, unit }) => (
            <li key={q.id} className="flex flex-col gap-1.5 rounded-lg p-2 py-3 transition-colors hover:bg-surface-bright">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label-md text-on-surface">{supplier.name}</span>
                <span className="shrink-0 text-label-sm text-outline">{q.submittedAt ? f.relative(q.submittedAt) : ''}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                <Trans
                  t={t}
                  i18nKey="feed.item"
                  values={{ code: rfqCode, price: f.money(q.unitPrice), unit, days: q.leadTimeDays }}
                  components={{ hl: <span className="font-bold tabular-nums text-primary" /> }}
                />
              </p>
              <Link to={`/buyer/rfqs/${rfqId}`} className="flex w-fit items-center gap-0.5 pt-1 text-label-sm text-primary hover:underline">
                {t('feed.check')}
                <Icon name="arrow_forward" size={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FeaturedSuppliers({ suppliers }: { suppliers: BuyerDashboard['featuredSuppliers'] }) {
  const { t } = useTranslation('buyerDashboard');
  const bookmark = useSupplierBookmark();
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div>
          <h2 className="text-headline-sm text-on-surface">{t('featured.title')}</h2>
          <p className="text-label-sm font-normal text-outline">{t('featured.subtitle')}</p>
        </div>
        <Icon name="verified" className="text-outline" />
      </div>
      {suppliers.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-on-surface-variant">{t('featured.empty')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {suppliers.map((s) => (
            <li key={s.id} className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-3 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-primary" aria-hidden>
                    <Icon name={CATEGORY_ICONS[s.categories[0]] ?? 'storefront'} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <Link to={`/buyer/suppliers/${s.id}`} className="text-label-md text-on-surface hover:text-primary">
                        {s.name}
                      </Link>
                      {s.verified && <Icon name="verified" size={16} className="text-primary" label={t('common:labels.verifiedByProcura')} />}
                    </div>
                    <span className="text-body-sm text-outline">{s.categories[0] ? t(`common:categories.${s.categories[0]}`) : s.tagline}</span>
                  </div>
                </div>
                <BookmarkToggle saved={bookmark.isSaved(s.id)} pending={bookmark.isPending(s.id)} onToggle={() => bookmark.toggle(s.id, s.name)} name={s.name} />
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-surface-container pt-2 text-body-sm">
                <span className="flex items-center gap-1 text-on-surface">
                  <Icon name="star" filled size={16} className="text-warning" />
                  <span className="font-bold tabular-nums">{s.rating.toFixed(1)}</span>
                  <span className="text-xs text-outline">({t('common:labels.reviews', { count: s.reviewCount })})</span>
                </span>
                <ButtonLink to={`/buyer/rfqs/new?suppliers=${s.id}`} variant="secondary" size="xs" className="text-primary hover:border-primary">
                  {t('featured.sendRfq')}
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 pt-2 text-center">
        <Link to="/buyer/suppliers" className="inline-flex items-center gap-1 text-label-md text-primary hover:underline">
          {t('featured.explore')}
          <Icon name="chevron_right" size={16} />
        </Link>
      </div>
    </Card>
  );
}
