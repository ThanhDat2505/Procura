import clsx from 'clsx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonLink,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  QuotationStatusBadge,
  RatingInline,
  RfqStatusBadge,
  Table,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui';
import { addDays, clock } from '@/domain/clock';
import { deadlineInfo, MIN_QUOTES_TO_COMPARE } from '@/domain/rfq';
import type { ID, Quotation, SupplierSummary } from '@/domain/types';
import { useRfq } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { RfqDetail } from '@/services';
import { QuoteDetailModal } from '../comparison/QuoteDetailModal';
import { buildQuoteRows, buildRfqTimeline, filterQuoteRows, responseSummary, totalSpread, type ResponseSummary, type TimelineStep } from './rfqDetailModel';

/** Simulated supplier replies arrive in the background; poll so they show up without a reload. */
const REFRESH_MS = 15_000;

/** BUY-07 — RFQ detail & progress. */
export default function RfqDetailPage() {
  const { rfqId = '' } = useParams();
  const query = useRfq(rfqId);
  const { refetch } = query;

  useEffect(() => {
    const handle = window.setInterval(() => void refetch(), REFRESH_MS);
    return () => window.clearInterval(handle);
  }, [refetch]);

  if (query.isPending) return <LoadingState rows={5} />;
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void refetch()} />
      </Card>
    );
  return <RfqDetailView detail={query.data} />;
}

function RfqDetailView({ detail }: { detail: RfqDetail }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const { rfq } = detail;
  const summary = responseSummary(detail);
  const winner = rfq.lifecycle === 'awarded' ? detail.quotations.find((q) => q.id === rfq.awardedQuotationId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            {
              label: (
                <span className="inline-flex items-center gap-1">
                  <Icon name="folder_open" size={16} />
                  {t('breadcrumb.rfqs')}
                </span>
              ),
              to: '/buyer/rfqs',
            },
            { label: <span className="rounded bg-surface-container px-2 py-0.5 font-code-tabular text-code-tabular text-on-surface">{rfq.code}</span> },
            { label: <span className="text-primary">{t('breadcrumb.detail')}</span> },
          ]}
        />
        {rfq.lifecycle !== 'draft' && <ResponsePill summary={summary} />}
      </div>

      <HeaderCard detail={detail} summary={summary} />

      {winner && (
        <Callout tone="success" icon="emoji_events" title={t('awarded.title', { name: winner.supplier.name })}>
          <span>
            {rfq.awardedAt && t('awarded.on', { date: f.date(rfq.awardedAt) })}{' '}
            <Link to={`/buyer/rfqs/${rfq.id}/compare`} className="font-semibold text-primary hover:underline">
              {t('awarded.viewComparison')}
            </Link>
          </span>
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SpecCard detail={detail} />
        <TimelineCard detail={detail} />
      </div>

      <QuotesCard detail={detail} summary={summary} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ResponsePill({ summary }: { summary: ResponseSummary }) {
  const { t } = useTranslation('rfqDetail');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-label-md',
        summary.complete ? 'border-success-border bg-success-container text-success' : 'border-[#BFDBFE] bg-[#EFF6FF] text-primary',
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', summary.complete ? 'animate-pulse bg-success' : 'bg-primary')} aria-hidden />
      {summary.complete
        ? t('pill.complete', { received: summary.received, expected: summary.expected })
        : t('pill.partial', { received: summary.received, expected: summary.expected })}
    </span>
  );
}

function HeaderCard({ detail, summary }: { detail: RfqDetail; summary: ResponseSummary }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const { rfq, status, owner } = detail;
  const info = deadlineInfo(rfq.deadline, clock.now());
  const deadlineLabel =
    info.urgency === 'overdue' ? t('common:deadline.overdue') : info.urgency === 'today' ? t('common:deadline.today') : t('common:deadline.daysLeft', { count: info.daysLeft });
  const compareEnabled = summary.canCompare && (rfq.lifecycle === 'open' || rfq.lifecycle === 'awarded');
  const editStep = Math.min(4, Math.max(1, rfq.completedStep + 1));

  return (
    <Card className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-primary-fixed px-2 py-0.5 font-code-tabular text-code-tabular font-bold text-on-primary-fixed">#{rfq.code}</span>
          {status === 'quoted' ? (
            <Badge tone="success" icon="check_circle">
              {t('header.readyToEvaluate')}
            </Badge>
          ) : (
            <RfqStatusBadge status={status} />
          )}
          {rfq.priority === 'high' && (
            <span className="text-body-sm text-on-surface-variant">
              {t('header.priority')}{' '}
              <strong className="font-semibold text-on-surface">
                {rfq.priorityNote ? t('header.priorityHighNote', { note: rfq.priorityNote }) : t('header.priorityHigh')}
              </strong>
            </span>
          )}
        </div>
        <h1 className="text-headline-lg font-bold tracking-tight text-on-surface">{rfq.title || t('header.untitled')}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-body-sm text-on-surface-variant">
          <MetaItem icon="calendar_today">
            {t('header.created')} <strong className="font-medium text-on-surface">{f.date(rfq.createdAt)}</strong>
          </MetaItem>
          <MetaItem icon="alarm">
            {t('header.deadline')}{' '}
            <strong className={clsx('font-semibold', rfq.lifecycle === 'open' ? 'text-danger' : 'text-on-surface')}>
              {f.date(rfq.deadline)}
              {rfq.lifecycle === 'open' && ` (${deadlineLabel})`}
            </strong>
          </MetaItem>
          <MetaItem icon="person">
            {t('header.owner')}{' '}
            <strong className="font-medium text-on-surface">
              {owner.name}
              {owner.title && ` (${owner.title})`}
            </strong>
          </MetaItem>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1.5 self-start lg:items-end lg:self-center">
        <div className="flex flex-wrap items-center gap-2.5">
          {rfq.lifecycle === 'draft' && (
            <ButtonLink variant="secondary" leftIcon="edit" to={`/buyer/rfqs/${rfq.id}/edit/${editStep}`}>
              {t('common:actions.edit')}
            </ButtonLink>
          )}
          <Button variant="secondary" leftIcon="picture_as_pdf" onClick={() => window.print()}>
            {t('header.exportPdf')}
          </Button>
          {compareEnabled ? (
            <ButtonLink size="lg" leftIcon="compare_arrows" rightIcon="arrow_forward" to={`/buyer/rfqs/${rfq.id}/compare`} className="ring-2 ring-primary/20">
              {t('header.compareNow', { count: summary.received })}
            </ButtonLink>
          ) : (
            <Button size="lg" leftIcon="compare_arrows" disabled aria-describedby="compare-hint">
              {t('header.compareNow', { count: summary.received })}
            </Button>
          )}
        </div>
        {!compareEnabled && (
          <p id="compare-hint" className="text-body-sm text-on-surface-variant">
            {t('header.compareHint', { min: MIN_QUOTES_TO_COMPARE })}
          </p>
        )}
      </div>
    </Card>
  );
}

function MetaItem({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name={icon} size={18} className="text-outline" />
      <span>{children}</span>
    </div>
  );
}

function SectionTitle({ icon, title, tone = 'primary', aside, as: Tag = 'h2' }: { icon: string; title: ReactNode; tone?: 'primary' | 'neutral'; aside?: ReactNode; as?: 'h2' }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3">
      <div className="flex items-center gap-2">
        <span className={clsx('rounded-lg p-1.5', tone === 'primary' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface')}>
          <Icon name={icon} size={18} />
        </span>
        <Tag className="text-headline-sm font-semibold text-on-surface">{title}</Tag>
      </div>
      {aside}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Specifications
// ---------------------------------------------------------------------------

function SpecCard({ detail }: { detail: RfqDetail }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const toast = useToast();
  const { rfq } = detail;
  const dash = '—';
  const qualityNote = rfq.terms.sampleNote || rfq.buyerNote;
  const budget =
    rfq.budgetMin && rfq.budgetMax
      ? `${f.money(rfq.budgetMin)} – ${f.money(rfq.budgetMax)}`
      : rfq.budgetMax
        ? t('specs.budgetMax', { value: f.money(rfq.budgetMax) })
        : rfq.budgetMin
          ? t('specs.budgetMin', { value: f.money(rfq.budgetMin) })
          : t('specs.budgetNone');

  return (
    <Card className="flex flex-col justify-between lg:col-span-7">
      <div>
        <SectionTitle
          icon="inventory_2"
          title={t('specs.title')}
          aside={
            <button type="button" className="text-label-sm text-primary hover:underline" onClick={() => toast(t('common:states.notSupported'), 'info')}>
              {t('specs.download')}
            </button>
          }
        />
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SpecTile label={t('specs.quantity')}>
            <span className="text-headline-md font-bold text-primary tabular-nums">{f.number(rfq.quantity)}</span>{' '}
            <span className="text-body-sm font-normal text-on-surface">{rfq.unit}</span>
          </SpecTile>
          <SpecTile label={t('specs.dimensions')}>{rfq.dimensions || dash}</SpecTile>
          <SpecTile label={t('specs.material')}>{rfq.material || dash}</SpecTile>
          <SpecTile label={t('specs.product')}>{rfq.productName || rfq.subcategory || dash}</SpecTile>
        </div>
        <ul className="space-y-2 border-t border-outline-variant/60 pt-3 text-body-sm">
          <SpecLine icon="palette" label={t('specs.finishing')}>
            {rfq.finishing || dash}
          </SpecLine>
          <SpecLine icon="location_on" label={t('specs.delivery')}>
            <span className="font-semibold">{rfq.deliveryAddress || dash}</span>
            {rfq.neededBy && <span className="text-on-surface-variant"> · {t('specs.neededBy', { date: f.date(rfq.neededBy) })}</span>}
          </SpecLine>
          <SpecLine icon="verified_user" label={t('specs.quality')}>
            {qualityNote || dash}
          </SpecLine>
          {rfq.terms.requiredCertifications.length > 0 && (
            <SpecLine icon="workspace_premium" label={t('specs.certifications')}>
              {rfq.terms.requiredCertifications.join(', ')}
            </SpecLine>
          )}
        </ul>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-3 text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <Icon name="shield" size={16} className="text-success" />
          {t('specs.sealed')}
        </span>
        <span className="text-on-surface">
          {t('specs.budget')} <strong className="font-bold text-primary tabular-nums">{budget}</strong>
        </span>
      </div>
    </Card>
  );
}

function SpecTile({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
      <div className="text-label-sm text-on-surface-variant">{label}</div>
      <div className="mt-0.5 break-words text-label-lg text-on-surface">{children}</div>
    </div>
  );
}

function SpecLine({ icon, label, children }: { icon: string; label: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={icon} size={18} className="mt-0.5 text-primary" />
      <div className="min-w-0">
        <span className="font-medium text-on-surface-variant">{label} </span>
        <span className="text-on-surface">{children}</span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function TimelineCard({ detail }: { detail: RfqDetail }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const { rfq } = detail;
  const timeline = useMemo(() => buildRfqTimeline(detail), [detail]);

  return (
    <Card className="flex flex-col justify-between lg:col-span-5">
      <div>
        <SectionTitle
          icon="timeline"
          tone="neutral"
          title={t('timeline.title')}
          aside={
            <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-label-sm font-bold text-primary">
              {t('timeline.step', { current: timeline.currentStep, total: timeline.total })}
            </span>
          }
        />
        <ol className="relative space-y-5 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-outline-variant">
          {timeline.steps.map((step) => (
            <TimelineItem key={step.key} step={step} />
          ))}
        </ol>
      </div>
      {rfq.lifecycle !== 'cancelled' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-surface-container-low p-3">
          <Icon name="info" className="text-primary" />
          <span className="text-body-sm text-on-surface">
            {rfq.lifecycle === 'awarded' && rfq.awardedAt ? (
              <>
                {t('timeline.awardedNote')} <strong>{f.date(rfq.awardedAt)}</strong>
              </>
            ) : (
              <>
                {t('timeline.deadlineNote')} <strong>{f.dateTime(rfq.deadline)}</strong>
              </>
            )}
          </span>
        </div>
      )}
    </Card>
  );
}

function TimelineItem({ step }: { step: TimelineStep }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const base = `timeline.${step.key}.${step.variant}`;
  const dot = {
    done: (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success ring-4 ring-surface-container-lowest">
        <Icon name="check" size={12} className="text-white" />
      </span>
    ),
    current: (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-primary-fixed">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    ),
    pending: (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-variant ring-4 ring-surface-container-lowest">
        <span className="h-1.5 w-1.5 rounded-full bg-outline" />
      </span>
    ),
    cancelled: (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger ring-4 ring-surface-container-lowest">
        <Icon name="close" size={12} className="text-white" />
      </span>
    ),
  }[step.state];

  return (
    <li className={clsx('relative', step.state === 'pending' && 'opacity-60')} aria-current={step.state === 'current' ? 'step' : undefined}>
      <span className="absolute -left-[23px] top-0.5" aria-hidden>
        {dot}
      </span>
      <div className={clsx('text-label-md', step.state === 'current' ? 'font-bold text-primary' : step.state === 'cancelled' ? 'text-danger' : 'text-on-surface')}>
        {step.at && `${f.dateTime(step.at)}: `}
        {t(`${base}.title`, step.values)}
      </div>
      <p className={clsx('text-body-sm', step.state === 'current' ? 'font-medium text-on-surface' : 'text-on-surface-variant')}>{t(`${base}.desc`, step.values)}</p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Quotation responses
// ---------------------------------------------------------------------------

type DetailQuote = Quotation & { supplier: SupplierSummary };

function QuotesCard({ detail, summary }: { detail: RfqDetail; summary: ResponseSummary }) {
  const { t } = useTranslation('rfqDetail');
  const f = useFormat();
  const { rfq } = detail;
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyMoqFit, setOnlyMoqFit] = useState(false);
  // Track de-selections so newly arriving quotes are selected by default.
  const [deselected, setDeselected] = useState<Set<ID>>(() => new Set());
  const [viewing, setViewing] = useState<DetailQuote | null>(null);

  const allRows = useMemo(() => buildQuoteRows(detail), [detail]);
  const rows = filterQuoteRows(allRows, onlyMoqFit);
  const visibleQuoteIds = rows.flatMap((r) => (r.kind === 'quote' ? [r.quotation.id] : []));
  const selectedIds = visibleQuoteIds.filter((id) => !deselected.has(id));
  const selectedSet = new Set(selectedIds);
  const spread = totalSpread(rows, selectedSet);
  const allSelected = visibleQuoteIds.length > 0 && selectedIds.length === visibleQuoteIds.length;
  const comparable = rfq.lifecycle === 'open' || rfq.lifecycle === 'awarded';
  const canCompareSelection = comparable && selectedIds.length >= MIN_QUOTES_TO_COMPARE;
  const compareHref = `/buyer/rfqs/${rfq.id}/compare${selectedIds.length === summary.received ? '' : `?ids=${selectedIds.join(',')}`}`;

  const toggle = (id: ID) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setDeselected((prev) => {
      const next = new Set(prev);
      for (const id of visibleQuoteIds) {
        if (allSelected) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const compareButton = (label: string, size: 'md' | 'lg' = 'md') =>
    canCompareSelection ? (
      <ButtonLink size={size} leftIcon="compare_arrows" to={compareHref}>
        {label}
      </ButtonLink>
    ) : (
      <Button size={size} leftIcon="compare_arrows" disabled title={t('quotes.selectHint', { min: MIN_QUOTES_TO_COMPARE })}>
        {label}
      </Button>
    );

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant p-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-headline-md font-bold text-on-surface">{t('quotes.title')}</h2>
            <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm font-bold text-on-primary-fixed">
              {t('quotes.count', { count: summary.received })}
            </span>
          </div>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('quotes.subtitle', { min: MIN_QUOTES_TO_COMPARE })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" leftIcon="filter_list" aria-expanded={filterOpen} aria-controls="quote-filter" onClick={() => setFilterOpen((o) => !o)} className={clsx(onlyMoqFit && 'border-primary text-primary')}>
            {t('quotes.filter')}
          </Button>
          {compareButton(t('quotes.compareSelected', { count: selectedIds.length }))}
        </div>
      </div>

      {filterOpen && (
        <div id="quote-filter" className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-5 py-3">
          <Checkbox
            checked={onlyMoqFit}
            onChange={(e) => setOnlyMoqFit(e.target.checked)}
            label={t('quotes.onlyMoqFit', { qty: f.number(rfq.quantity), unit: rfq.unit })}
            description={t('quotes.onlyMoqFitHint')}
          />
          {onlyMoqFit && (
            <Button variant="ghost" size="sm" onClick={() => setOnlyMoqFit(false)}>
              {t('common:actions.reset')}
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={allRows.length === 0 ? 'mark_email_unread' : 'filter_alt_off'}
          title={allRows.length === 0 ? t('quotes.emptyTitle') : t('quotes.filteredEmptyTitle')}
          description={allRows.length === 0 ? t('quotes.emptyDesc') : t('quotes.filteredEmptyDesc')}
        />
      ) : (
        <Table minWidth={1060}>
          <THead>
            <tr>
              <Th className="w-12 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                  checked={allSelected}
                  disabled={visibleQuoteIds.length === 0}
                  onChange={toggleAll}
                  aria-label={t('quotes.selectAll')}
                />
              </Th>
              <Th className="min-w-[240px]">{t('quotes.col.supplier')}</Th>
              <Th>{t('quotes.col.unitPrice', { unit: rfq.unit })}</Th>
              <Th>{t('quotes.col.total', { qty: f.number(rfq.quantity), unit: rfq.unit })}</Th>
              <Th>{t('quotes.col.moq')}</Th>
              <Th>{t('quotes.col.leadTime')}</Th>
              <Th>{t('quotes.col.status')}</Th>
              <Th className="text-right">{t('common:labels.actions')}</Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((row) =>
              row.kind === 'quote' ? (
                <Tr key={row.quotation.id} selected={selectedSet.has(row.quotation.id)}>
                  <Td className="text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                      checked={selectedSet.has(row.quotation.id)}
                      onChange={() => toggle(row.quotation.id)}
                      aria-label={t('quotes.selectOne', { name: row.supplier.name })}
                    />
                  </Td>
                  <Td>
                    <SupplierCell supplier={row.supplier} />
                  </Td>
                  <Td>
                    <div className={clsx('text-headline-sm font-bold tabular-nums', row.lowestUnitPrice ? 'text-success' : 'text-on-surface')}>{f.money(row.quotation.unitPrice)}</div>
                    {row.lowestUnitPrice && <div className="text-label-sm text-success">{t('quotes.lowestUnitPrice')}</div>}
                  </Td>
                  <Td>
                    <div className={clsx('text-headline-sm font-bold tabular-nums', row.moqFit ? 'text-primary' : 'text-danger')}>{f.money(row.total)}</div>
                    <div className={clsx('text-label-sm', row.moqFit ? 'text-on-surface-variant' : 'text-danger')}>
                      {row.moqFit
                        ? t('quotes.totalFor', { qty: f.number(rfq.quantity), unit: rfq.unit })
                        : t('quotes.totalForMoq', { qty: f.number(row.quotation.moq), unit: rfq.unit })}
                    </div>
                  </Td>
                  <Td>
                    <div className={clsx('font-code-tabular text-code-tabular font-semibold', row.moqFit ? 'text-on-surface' : 'text-danger')}>
                      {`${f.number(row.quotation.moq)} ${rfq.unit}`}
                    </div>
                    {row.moqFit ? (
                      <div className="flex items-center gap-0.5 whitespace-nowrap text-label-sm text-success">
                        <Icon name="check" size={13} />
                        {t('quotes.moqFit')}
                      </div>
                    ) : (
                      <Badge tone="danger" icon="warning" className="mt-0.5 rounded">
                        {t('quotes.moqOver')}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <div className={clsx('flex items-center gap-1 font-semibold tabular-nums', row.fastest ? 'text-primary' : 'text-on-surface')}>
                      <Icon name={row.fastest ? 'bolt' : 'local_shipping'} size={16} className={row.fastest ? 'text-primary' : 'text-outline'} />
                      {t('common:time.days', { count: row.quotation.leadTimeDays })}
                    </div>
                    <div className={clsx('whitespace-nowrap text-label-sm', row.fastest ? 'font-semibold text-success' : 'text-on-surface-variant')}>
                      {row.fastest
                        ? t('quotes.fastest', { date: f.dayMonth(addDays(clock.now(), row.quotation.leadTimeDays)) })
                        : t('quotes.eta', { date: f.dayMonth(addDays(clock.now(), row.quotation.leadTimeDays)) })}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <QuotationStatusBadge status={row.quotation.status} />
                      <RatingInline value={row.supplier.rating} count={row.supplier.reviewCount} />
                      {row.quotation.submittedAt && (
                        <span className="text-label-sm font-normal text-on-surface-variant">{t('quotes.sentAt', { time: f.dateTime(row.quotation.submittedAt) })}</span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewing({ ...row.quotation, supplier: row.supplier })}>
                      {t('common:actions.viewDetail')}
                    </Button>
                  </Td>
                </Tr>
              ) : (
                <Tr key={row.supplier.id} className="bg-surface-container-low/50 text-on-surface-variant">
                  <Td className="text-center">
                    <input type="checkbox" className="h-4 w-4 rounded border-outline opacity-40" disabled aria-label={t('quotes.selectOne', { name: row.supplier.name })} />
                  </Td>
                  <Td className="opacity-70">
                    <SupplierCell supplier={row.supplier} muted />
                  </Td>
                  <Td colSpan={4}>
                    <span className="flex items-center gap-1.5 text-body-md italic">
                      <Icon name={row.kind === 'declined' ? 'block' : 'hourglass_empty'} size={16} className="text-outline" />
                      {row.kind === 'declined' ? t('quotes.declinedNote') : t('quotes.pendingNote')}
                      {row.kind === 'pending' && (
                        <span className="not-italic text-body-sm">
                          {' · '}
                          {row.invitation.viewedAt ? t('quotes.viewedAt', { time: f.dateTime(row.invitation.viewedAt) }) : t('quotes.notViewed')}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    {row.kind === 'declined' ? (
                      <Badge tone="danger" dot>
                        {t('quotes.declined')}
                      </Badge>
                    ) : (
                      <Badge tone="neutral" dot>
                        {t('quotes.pending')}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <ButtonLink variant="ghost" size="sm" to={`/buyer/suppliers/${row.supplier.id}`}>
                      {t('common:actions.viewProfile')}
                    </ButtonLink>
                  </Td>
                </Tr>
              ),
            )}
          </tbody>
        </Table>
      )}

      {summary.received > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-label-md text-on-surface">{t('quotes.selectedCount', { count: selectedIds.length })}</span>
            {spread && (
              <>
                <span className="hidden text-outline sm:inline" aria-hidden>
                  |
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {t('quotes.spread')}{' '}
                  <strong className="text-on-surface tabular-nums">
                    {f.money(spread.amount)} ({f.percent(spread.ratio, 1)})
                  </strong>
                </span>
              </>
            )}
          </div>
          {compareButton(t('quotes.compareDetail', { count: selectedIds.length }), 'lg')}
        </div>
      )}

      <QuoteDetailModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        quotation={viewing}
        supplierName={viewing?.supplier.name ?? ''}
        supplierLocation={viewing?.supplier.locationLabel}
        quantity={rfq.quantity}
        unit={rfq.unit}
      />
    </Card>
  );
}

function SupplierCell({ supplier, muted }: { supplier: SupplierSummary; muted?: boolean }) {
  const { t } = useTranslation('rfqDetail');
  return (
    <div className="flex items-start gap-3">
      <Avatar initials={supplier.initials} square tone={muted ? 'neutral' : 'primary'} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link to={`/buyer/suppliers/${supplier.id}`} className="text-label-lg font-bold text-on-surface hover:text-primary hover:underline">
            {supplier.name}
          </Link>
          {supplier.verified && <Icon name="verified" filled size={16} className="text-primary" label={t('common:labels.verifiedByProcura')} />}
        </div>
        <div className="mt-0.5 text-body-sm text-on-surface-variant">{supplier.locationLabel}</div>
      </div>
    </div>
  );
}
