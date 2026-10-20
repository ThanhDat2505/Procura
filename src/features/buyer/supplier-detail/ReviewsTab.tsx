import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Icon, LoadingState, Pagination, ProgressBar, RatingStars, Select, useToast } from '@/components/ui';
import type { ReviewSummary, SupplierReview } from '@/domain/types';
import { useSupplier, useSupplierReviews } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { ReviewQuery, ReviewsResult } from '@/services';
import { formatScore, newRfqWithSupplier, ScoreBar, useSupplierId } from './shared';
import { ratio } from './supplierDetail';

const PAGE_SIZE = 4;
type ReviewFilter = 'all' | 'r5' | 'r4' | 'withText' | 'sameCategory';
type ReviewSort = ReviewQuery['sort'];

function toQuery(filter: ReviewFilter, sort: ReviewSort, page: number): ReviewQuery {
  return {
    sort,
    page,
    pageSize: PAGE_SIZE,
    rating: filter === 'r5' ? 5 : filter === 'r4' ? 4 : undefined,
    withText: filter === 'withText' || undefined,
    sameCategory: filter === 'sameCategory' || undefined,
  };
}

/** BUY-03e — "Đánh giá từ người mua". */
export default function ReviewsTab() {
  const { t } = useTranslation('supplierDetail');
  const supplierId = useSupplierId();
  const supplier = useSupplier(supplierId);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [page, setPage] = useState(1);
  const reviews = useSupplierReviews(supplierId, toQuery(filter, sort, page));

  if (reviews.isPending || supplier.isPending) return <LoadingState />;
  if (reviews.isError) return <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />;
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />;

  const s = supplier.data;
  const { summary, page: result, pendingReviewRfqs } = reviews.data;

  const chips: { value: ReviewFilter; label: string }[] = [
    { value: 'all', label: t('reviews.filters.all', { count: summary.total }) },
    { value: 'r5', label: t('reviews.filters.stars', { stars: 5, count: summary.distribution[0] }) },
    { value: 'r4', label: t('reviews.filters.stars', { stars: 4, count: summary.distribution[1] }) },
    { value: 'withText', label: t('reviews.filters.withText') },
    { value: 'sameCategory', label: t('reviews.filters.sameCategory', { category: s.categories[0] ? t(`common:categories.${s.categories[0]}`) : '' }) },
  ];

  return (
    <section className="grid grid-cols-1 items-start gap-6 pb-6 lg:grid-cols-12" aria-label={t('tabs.reviews')}>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <SummaryCard summary={summary} />

        <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('reviews.filters.label')}>
            {chips.map((c) => {
              const active = filter === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(c.value);
                    setPage(1);
                  }}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-label-sm transition-colors',
                    active ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <Select
            compact
            value={sort}
            aria-label={t('reviews.sort.label')}
            onChange={(e) => {
              setSort(e.target.value as ReviewSort);
              setPage(1);
            }}
            className="w-full sm:w-56"
          >
            <option value="newest">{t('reviews.sort.newest')}</option>
            <option value="highest">{t('reviews.sort.highest')}</option>
            <option value="lowest">{t('reviews.sort.lowest')}</option>
          </Select>
        </Card>

        <div className={clsx('flex flex-col gap-4 transition-opacity', reviews.isPlaceholderData && 'opacity-60')} aria-busy={reviews.isFetching}>
          {result.items.length === 0 ? (
            <Card>
              <EmptyState icon="reviews" title={t('reviews.empty')} />
            </Card>
          ) : (
            result.items.map((r) => <ReviewCard key={r.id} review={r} supplierName={s.shortName} />)
          )}
        </div>

        {result.total > PAGE_SIZE && <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} />}
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
        <YourReviewCard pending={pendingReviewRfqs} />
        <Card padding="md" className="flex flex-col gap-3">
          <h2 className="text-headline-sm text-on-surface">{t('reviews.cta.title')}</h2>
          <p className="text-body-sm text-on-surface-variant">{t('reviews.cta.body', { name: s.shortName, sla: s.responseSla })}</p>
          <ButtonLink to={newRfqWithSupplier(s.id)} variant="secondary" leftIcon="file_open" fullWidth>
            {t('reviews.cta.action')}
          </ButtonLink>
        </Card>
      </div>
    </section>
  );
}

function SummaryCard({ summary }: { summary: ReviewSummary }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const distTotal = summary.distribution.reduce((a, b) => a + b, 0);
  return (
    <Card padding="lg">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
        <div className="flex flex-col items-center justify-center border-b border-outline-variant p-3 pb-6 text-center md:col-span-4 md:border-b-0 md:border-r md:pb-3">
          <span className="mb-2 text-display-lg leading-none tabular-nums text-procura-navy">{formatScore(summary.average)}</span>
          <RatingStars value={summary.average} size={22} className="mb-2" />
          <p className="text-body-sm leading-snug text-on-surface-variant">{t('reviews.summary.caption', { count: summary.total })}</p>
        </div>
        <ul className="flex flex-col gap-2 md:col-span-4" aria-label={t('reviews.summary.distribution')}>
          {summary.distribution.map((count, i) => {
            const stars = 5 - i;
            return (
              <li key={stars} className={clsx('flex items-center gap-2 text-body-sm', count === 0 && 'opacity-60')}>
                <span className="w-6 text-right font-semibold text-on-surface">{stars}★</span>
                <ProgressBar value={ratio(count, distTotal)} className="flex-1" label={t('reviews.summary.starsLabel', { stars })} />
                <span className="w-6 text-right text-[11px] tabular-nums text-on-surface-variant">{f.number(count)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2.5 md:col-span-4 md:pl-2">
          <ScoreBar compact suffix="5.0" label={t('reviews.criteria.quality')} value={summary.criteria.quality} />
          <ScoreBar compact suffix="5.0" label={t('reviews.criteria.onTime')} value={summary.criteria.onTime} />
          <ScoreBar compact suffix="5.0" label={t('reviews.criteria.price')} value={summary.criteria.price} />
          <ScoreBar compact suffix="5.0" label={t('reviews.criteria.support')} value={summary.criteria.support} />
        </div>
      </div>
    </Card>
  );
}

function ReviewCard({ review: r, supplierName }: { review: SupplierReview; supplierName: string }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  return (
    <Card as="article" padding="md" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar initials={r.buyerInitials} size="md" />
          <div className="min-w-0">
            <h3 className="text-headline-sm text-on-surface">{r.buyerName}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Badge tone="navy" icon="check_circle">
                {t('reviews.card.verifiedBuyer')}
              </Badge>
              <span className="text-body-sm text-on-surface-variant">
                {r.rfqCode} · {r.rfqTitle}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-0.5">
          <RatingStars value={r.rating} size={16} />
          <time dateTime={r.date} className="text-[11px] tabular-nums text-outline">
            {f.date(r.date)}
          </time>
        </div>
      </div>
      <p className="text-body-md leading-relaxed text-on-surface">“{r.text}”</p>
      {r.reply && (
        <div className="flex flex-col gap-1 rounded-r-lg border-l-2 border-primary bg-surface-container-low p-3 pl-4">
          <p className="flex items-center gap-1.5 text-label-sm text-primary">
            <Icon name="reply" size={14} />
            {t('reviews.card.reply', { name: supplierName })}
          </p>
          <p className="text-body-sm text-on-surface-variant">{r.reply}</p>
        </div>
      )}
    </Card>
  );
}

function YourReviewCard({ pending }: { pending: ReviewsResult['pendingReviewRfqs'] }) {
  const { t } = useTranslation('supplierDetail');
  const toast = useToast();
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 border-b border-outline-variant pb-3 text-headline-sm text-on-surface">
        <Icon name="rate_review" className="text-primary" />
        {t('reviews.yours.title')}
      </h2>
      <div className="flex gap-2.5 rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <Icon name="info" size={18} className="mt-0.5 text-primary" />
        <p className="text-body-sm leading-snug text-on-surface-variant">{t('reviews.yours.info')}</p>
      </div>
      {pending.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t('reviews.yours.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((p) => (
            <li key={p.rfqId} className="flex flex-col gap-2 rounded-lg border border-outline-variant p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-label-sm font-bold tabular-nums text-primary">{p.code}</span>
                <Badge tone="navy">{t('reviews.yours.awarded')}</Badge>
              </div>
              <p className="text-body-sm font-medium text-on-surface">{p.title}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="flex items-center gap-1 text-label-sm text-warning">
                  <Icon name="pending" size={14} />
                  {t('reviews.yours.notReviewed')}
                </span>
                <Button size="xs" onClick={() => toast(t('common:states.notSupported'), 'info')}>
                  {t('reviews.yours.write')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-bright p-3.5">
        <Icon name="verified_user" filled className="mt-0.5 text-primary" />
        <p className="text-[12px] leading-relaxed text-on-surface-variant">{t('reviews.yours.trust')}</p>
      </div>
    </Card>
  );
}

