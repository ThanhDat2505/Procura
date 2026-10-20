import clsx from 'clsx';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Icon, LoadingState, ProgressBar, Select, StatCard } from '@/components/ui';
import { CATEGORIES } from '@/domain/catalog';
import { clock } from '@/domain/clock';
import { deadlineInfo, MIN_QUOTES_TO_COMPARE } from '@/domain/rfq';
import type { CategoryId } from '@/domain/types';
import { useCompareOverview } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { CompareOverviewCard } from '@/services';
import { filterOverview, overviewCategories, overviewStats, quarterOf, type CategoryFilter } from './compareListModel';

/** BUY-09 — comparison overview across RFQs. */
export default function CompareOverviewPage() {
  const { t } = useTranslation('compareList');
  const f = useFormat();
  const query = useCompareOverview();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const now = clock.now();
  const { quarter, year } = quarterOf(now);

  const lists = useMemo(() => (query.data ? filterOverview(query.data, category) : null), [query.data, category]);
  const stats = lists ? overviewStats(lists) : null;
  const present = query.data ? new Set(overviewCategories(query.data)) : new Set<CategoryId>();
  const categoryOptions = CATEGORIES.filter((c) => present.has(c.id));

  return (
    <>
      <section className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-primary">{t('eyebrow')}</span>
            <span className="text-outline" aria-hidden>
              /
            </span>
            <span className="text-label-sm text-on-surface-variant">{t('quarter', { quarter, year })}</span>
          </div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">{t('title')}</h1>
          <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">{t('subtitle')}</p>
        </div>
        <Select
          aria-label={t('categoryFilter')}
          className="w-full md:w-60"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryFilter)}
        >
          <option value="all">{t('allCategories')}</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.labelKey, { ns: 'common' })}
            </option>
          ))}
        </Select>
      </section>

      {query.isPending ? (
        <LoadingState rows={4} />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : (
        lists &&
        stats && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t('stats.ready')}
                value={t('packages', { count: stats.ready })}
                icon="price_change"
                valueClassName="!text-headline-md font-bold"
                footer={<span className="text-success">{t('stats.readyFoot')}</span>}
              />
              <StatCard
                label={t('stats.waiting')}
                value={t('packages', { count: stats.waiting })}
                icon="hourglass_top"
                iconTone="warning"
                valueClassName="!text-headline-md font-bold"
                footer={t('stats.waitingFoot', { min: MIN_QUOTES_TO_COMPARE })}
              />
              <StatCard
                label={t('stats.awarded')}
                value={t('packages', { count: stats.awarded })}
                icon="task_alt"
                iconTone="success"
                valueClassName="!text-headline-md font-bold"
                footer={
                  stats.avgSavings !== null ? (
                    <span className={stats.avgSavings >= 0 ? 'text-success' : 'text-danger'}>
                      {stats.avgSavings >= 0 ? t('stats.avgSavings', { value: f.percent(stats.avgSavings) }) : t('stats.avgOver', { value: f.percent(-stats.avgSavings) })}
                    </span>
                  ) : (
                    t('stats.noSavings')
                  )
                }
              />
              <StatCard
                label={t('stats.budget')}
                value={f.money(stats.negotiatedBudget)}
                icon="account_balance_wallet"
                iconTone="neutral"
                valueClassName="!text-headline-md font-bold"
                footer={t('stats.budgetFoot', { month: String(now.getMonth() + 1).padStart(2, '0'), year: now.getFullYear() })}
              />
            </div>

            <Section
              title={t('ready.title')}
              chip={<Badge tone="success">{t('ready.chip', { min: MIN_QUOTES_TO_COMPARE })}</Badge>}
              aside={<span className="text-body-sm text-outline">{t('ready.count', { count: lists.ready.length })}</span>}
            >
              {lists.ready.length === 0 ? (
                <EmptyCard icon="compare_arrows" title={t('ready.emptyTitle')} description={t('ready.emptyDesc', { min: MIN_QUOTES_TO_COMPARE })} />
              ) : (
                <div className="grid grid-cols-1 gap-5 pt-3 md:grid-cols-2 lg:grid-cols-3">
                  {lists.ready.map((card, i) => (
                    <ReadyCard key={card.item.rfq.id} card={card} highlight={i === 0} />
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={t('waiting.title')}
              chip={<Badge tone="warning">{t('waiting.chip')}</Badge>}
              aside={<span className="text-body-sm text-outline">{t('waiting.rule', { min: MIN_QUOTES_TO_COMPARE })}</span>}
            >
              {lists.waiting.length === 0 ? (
                <EmptyCard icon="hourglass_empty" title={t('waiting.emptyTitle')} />
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {lists.waiting.map((card) => (
                    <WaitingCard key={card.item.rfq.id} card={card} />
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={t('awarded.title')}
              chip={<Badge tone="navy">{t('awarded.chip')}</Badge>}
              aside={
                <Link to="/buyer/rfqs" className="flex items-center gap-1 text-label-md text-primary hover:underline">
                  {t('awarded.archive')}
                  <Icon name="chevron_right" size={16} />
                </Link>
              }
              last
            >
              {lists.awarded.length === 0 ? (
                <EmptyCard icon="emoji_events" title={t('awarded.emptyTitle')} description={t('awarded.emptyDesc')} />
              ) : (
                <div className="flex flex-col gap-4">
                  {lists.awarded.map((card) => (
                    <AwardedRow key={card.item.rfq.id} card={card} />
                  ))}
                </div>
              )}
            </Section>
          </>
        )
      )}
    </>
  );
}

function Section({ title, chip, aside, last, children }: { title: ReactNode; chip: ReactNode; aside?: ReactNode; last?: boolean; children: ReactNode }) {
  return (
    <section className={clsx(!last && 'mb-10')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-headline-sm font-bold text-on-surface">{title}</h2>
          {chip}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EmptyCard({ icon, title, description }: { icon: string; title: ReactNode; description?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest">
      <EmptyState icon={icon} title={title} description={description} className="py-8" />
    </div>
  );
}

function useDeadlineText() {
  const { t } = useTranslation('compareList');
  return (deadline: string) => {
    const info = deadlineInfo(deadline, clock.now());
    if (info.urgency === 'overdue') return t('deadline.overdue');
    if (info.urgency === 'today') return t('deadline.today');
    return t('deadline.inDays', { count: info.daysLeft });
  };
}

function BudgetText({ min, max }: { min?: number; max?: number }) {
  const { t } = useTranslation('compareList');
  const f = useFormat();
  if (min && max) return <>{`${f.money(min)} – ${f.money(max)}`}</>;
  if (max) return <>{f.money(max)}</>;
  if (min) return <>{t('budgetFrom', { value: f.money(min) })}</>;
  return <>{t('budgetNone')}</>;
}

function ReadyCard({ card, highlight }: { card: CompareOverviewCard; highlight: boolean }) {
  const { t } = useTranslation('compareList');
  const f = useFormat();
  const deadlineText = useDeadlineText();
  const { rfq, quoteCount, invitedCount } = card.item;
  const category = CATEGORIES.find((c) => c.id === rfq.categoryId);

  return (
    <article
      className={clsx(
        'relative flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md',
        highlight ? 'border-2 border-primary/80' : 'border border-outline-variant',
      )}
    >
      {highlight && (
        <span className="absolute -top-3 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary shadow-sm">{t('ready.suggested')}</span>
      )}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-label-sm text-outline">
          <span className="font-code-tabular font-semibold text-primary">{rfq.code}</span>
          <span>{t('ready.expires', { when: deadlineText(rfq.deadline) })}</span>
        </div>
        <h3 className="line-clamp-2 text-headline-sm font-bold leading-snug text-on-surface">
          <Link to={`/buyer/rfqs/${rfq.id}`} className="hover:text-primary">
            {rfq.title}
          </Link>
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5 text-label-sm text-on-surface-variant">
          {category && <span className="rounded border border-outline-variant/60 bg-surface-container-low px-2 py-1">{t(category.labelKey, { ns: 'common' })}</span>}
          <span className="rounded border border-outline-variant/60 bg-surface-container-low px-2 py-1">{`${f.number(rfq.quantity)} ${rfq.unit}`}</span>
        </div>
        <div className="mt-3 rounded-lg border border-outline-variant/50 bg-surface-container-low p-2.5">
          <div className="text-[11px] text-outline">{t('budget')}</div>
          <div className="mt-0.5 text-body-md font-bold tabular-nums text-on-surface">
            <BudgetText min={rfq.budgetMin} max={rfq.budgetMax} />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-label-sm">
            <span className="font-medium text-on-surface">{t('progress')}</span>
            <span className="font-bold text-primary">{t('progressValue', { done: quoteCount, total: invitedCount })}</span>
          </div>
          <ProgressBar value={invitedCount ? quoteCount / invitedCount : 0} label={t('progress')} />
        </div>
        <div className="mt-4 space-y-2 border-t border-outline-variant/70 pt-3">
          {card.lowestUnitPrice && (
            <div className="flex items-center justify-between gap-2 text-body-sm">
              <span className="shrink-0 whitespace-nowrap text-outline">{t('lowestPrice')}</span>
              <span className="rounded border border-success-border bg-success-container px-1.5 py-0.5 text-right font-semibold tabular-nums text-success">
                {t('priceBy', { price: `${f.money(card.lowestUnitPrice.value)}/${rfq.unit}`, supplier: card.lowestUnitPrice.supplierName })}
              </span>
            </div>
          )}
          {card.fastestLeadTime && (
            <div className="flex items-center justify-between gap-2 text-body-sm">
              <span className="shrink-0 whitespace-nowrap text-outline">{t('fastestLead')}</span>
              <span className="text-right font-semibold text-on-surface">
                {t('leadBy', { days: t('common:time.days', { count: card.fastestLeadTime.days }), supplier: card.fastestLeadTime.supplierName })}
              </span>
            </div>
          )}
        </div>
      </div>
      <ButtonLink to={`/buyer/rfqs/${rfq.id}/compare`} size="lg" rightIcon="arrow_forward" fullWidth className="mt-5">
        {t('ready.open')}
      </ButtonLink>
    </article>
  );
}

function WaitingCard({ card }: { card: CompareOverviewCard }) {
  const { t } = useTranslation('compareList');
  const f = useFormat();
  const { rfq, quoteCount, invitedCount } = card.item;
  const category = CATEGORIES.find((c) => c.id === rfq.categoryId);
  const urgency = deadlineInfo(rfq.deadline, clock.now()).urgency;
  const missing = Math.max(0, MIN_QUOTES_TO_COMPARE - quoteCount);

  return (
    <article className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-label-sm text-outline">
        <span className="font-code-tabular font-semibold text-on-surface-variant">{rfq.code}</span>
        <span className={clsx('rounded px-2 py-0.5', urgency === 'soon' || urgency === 'today' ? 'bg-warning-container font-semibold text-warning' : 'text-outline')}>
          {t('waiting.deadline', { date: f.date(rfq.deadline) })}
        </span>
      </div>
      <h3 className="text-headline-sm font-semibold text-on-surface">
        <Link to={`/buyer/rfqs/${rfq.id}`} className="hover:text-primary">
          {rfq.title}
        </Link>
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
        {category && <span className="rounded border border-outline-variant/50 bg-surface-container-low px-2 py-0.5">{t(category.labelKey, { ns: 'common' })}</span>}
        <span className="text-outline" aria-hidden>
          ·
        </span>
        <span>{t('waiting.progress', { done: quoteCount, total: invitedCount })}</span>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" size={18} className="text-outline" />
          <span>{t('waiting.note', { count: missing })}</span>
        </div>
        <Button variant="secondary" disabled className="self-stretch sm:self-end">
          {t('waiting.disabled', { min: MIN_QUOTES_TO_COMPARE })}
        </Button>
      </div>
    </article>
  );
}

function AwardedRow({ card }: { card: CompareOverviewCard }) {
  const { t } = useTranslation('compareList');
  const f = useFormat();
  const { rfq } = card.item;
  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-code-tabular text-label-sm font-bold text-primary">{rfq.code}</span>
            {card.awardedSupplierName && (
              <Badge tone="success" icon="verified">
                {t('awarded.selected', { name: card.awardedSupplierName })}
              </Badge>
            )}
            {rfq.awardedAt && <span className="text-label-sm text-outline">{t('awarded.decidedOn', { date: f.date(rfq.awardedAt) })}</span>}
          </div>
          <h3 className="text-headline-sm font-bold text-on-surface">
            <Link to={`/buyer/rfqs/${rfq.id}`} className="hover:text-primary">
              {rfq.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-body-sm text-on-surface-variant">
            {card.awardedUnitPrice !== undefined && (
              <span>
                <span className="text-outline">{t('awarded.unitPrice')} </span>
                <span className="font-code-tabular font-semibold text-on-surface">{`${f.money(card.awardedUnitPrice)}/${rfq.unit}`}</span>
              </span>
            )}
            {card.savingsRate !== undefined && (
              <>
                <span className="hidden h-3 w-px bg-outline-variant sm:block" aria-hidden />
                <span>
                  <span className="text-outline">{t('awarded.savings')} </span>
                  <span
                    className={clsx(
                      'rounded border px-1.5 py-0.5 font-bold',
                      card.savingsRate >= 0 ? 'border-success-border bg-success-container text-success' : 'border-danger-border bg-danger-container text-danger',
                    )}
                  >
                    {card.savingsRate >= 0 ? t('awarded.savingsValue', { value: f.percent(card.savingsRate) }) : t('awarded.overValue', { value: f.percent(-card.savingsRate) })}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
        <ButtonLink variant="secondary" leftIcon="history_edu" to={`/buyer/rfqs/${rfq.id}/compare`} className="self-start lg:self-center">
          {t('awarded.review')}
        </ButtonLink>
      </div>
    </article>
  );
}
