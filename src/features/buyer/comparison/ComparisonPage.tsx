import clsx from 'clsx';
import { useMemo, useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  KeyValue,
  LoadingState,
  PageHeader,
  ProgressBar,
  QuotationStatusBadge,
  Textarea,
  useToast,
} from '@/components/ui';
import { clock, daysBetween } from '@/domain/clock';
import { compareQuotations, type ComparedQuote, type ComparisonResult } from '@/domain/comparison';
import { MIN_QUOTES_TO_COMPARE } from '@/domain/rfq';
import type { Rfq } from '@/domain/types';
import { useAwardQuotation, useComparison, useRejectQuotation } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { ComparisonData } from '@/services';
import {
  buildCsv,
  distinctive,
  EXPIRING_SOON_DAYS,
  mergeCertifications,
  orderColumns,
  parseIds,
  selectComparedQuotes,
  validityDaysLeft,
  visibleMatrixRows,
  type MatrixMode,
  type MatrixRowKey,
} from './comparisonModel';
import { QuoteDetailModal } from './QuoteDetailModal';

/** BUY-08 — quotation comparison matrix & award decision. */
export default function ComparisonPage() {
  const { rfqId = '' } = useParams();
  const [params] = useSearchParams();
  const query = useComparison(rfqId);

  if (query.isPending) return <LoadingState rows={6} />;
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  return <ComparisonView data={query.data} ids={parseIds(params.get('ids'))} />;
}

type ViewData = ComparisonData & { result: ComparisonResult };

function useErrorMessage() {
  const { t } = useTranslation('comparison');
  return (error: unknown) => {
    const code = (error as { code?: string })?.code;
    return code ? t(code, { ns: 'common', defaultValue: t('common:errors.generic') }) : t('common:errors.generic');
  };
}

function ComparisonView({ data, ids }: { data: ViewData; ids: string[] | null }) {
  const { t } = useTranslation('comparison');
  const f = useFormat();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const { rfq } = data;

  const compared = useMemo(() => selectComparedQuotes(rfq, data.quotations, ids), [rfq, data.quotations, ids]);
  const result = useMemo(
    () => (compared.length === data.quotations.length ? data.result : compareQuotations(rfq, compared, data.suppliers)),
    [compared, data.quotations.length, data.result, data.suppliers, rfq],
  );

  const awarded = rfq.lifecycle === 'awarded';
  const decisionsOpen = rfq.lifecycle === 'open';
  const highlightId = awarded ? rfq.awardedQuotationId : result.recommended?.quotation.id;
  const columns = orderColumns(result.rows, highlightId);
  const reference = columns.find((c) => c.quotation.id === highlightId) ?? null;
  const rejectedHidden = decisionsOpen ? data.quotations.filter((q) => q.status === 'not_selected').length : 0;
  const restricted = ids !== null && compared.length < data.quotations.length - rejectedHidden;

  const winnerQuote = awarded ? data.quotations.find((q) => q.id === rfq.awardedQuotationId) : undefined;
  const winnerName = winnerQuote ? data.suppliers.find((s) => s.id === winnerQuote.supplierId)?.name : undefined;

  const [mode, setMode] = useState<MatrixMode>('all');
  const [awardTarget, setAwardTarget] = useState<ComparedQuote | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ComparedQuote | null>(null);
  const [reason, setReason] = useState('');
  const [viewing, setViewing] = useState<ComparedQuote | null>(null);
  const award = useAwardQuotation(rfq.id);
  const reject = useRejectQuotation(rfq.id);

  const specLine = [rfq.productName, rfq.dimensions, rfq.material].filter(Boolean).join(' · ');

  const exportCsv = () => {
    const unit = rfq.unit;
    const header = [t('matrix.criteria'), ...columns.map((c) => c.supplier.name)];
    const rows: (string | number)[][] = [
      [t('rows.unitPrice.label', { unit }), ...columns.map((c) => f.money(c.quotation.unitPrice))],
      [t('export.billedQty'), ...columns.map((c) => `${f.number(c.effectiveQuantity)} ${unit}`)],
      [t('export.total'), ...columns.map((c) => f.money(c.total))],
      [t('rows.moq.label'), ...columns.map((c) => `${f.number(c.quotation.moq)} ${unit}`)],
      [t('rows.leadTime.label'), ...columns.map((c) => t('common:time.workingDays', { count: c.quotation.leadTimeDays }))],
      [t('rows.payment.label'), ...columns.map((c) => c.quotation.paymentTerms)],
      [t('rows.validity.label'), ...columns.map((c) => t('rows.validity.until', { days: c.quotation.validityDays, date: f.date(c.validUntil) }))],
      [
        t('rows.tooling.label'),
        ...columns.map((c) => [c.quotation.toolingCost > 0 ? f.money(c.quotation.toolingCost) : t('rows.tooling.free'), c.quotation.toolingNote].filter(Boolean).join(' – ')),
      ],
      [t('export.certifications'), ...columns.map((c) => certList(c).join(', '))],
      [t('export.rating'), ...columns.map((c) => `${c.supplier.rating.toFixed(1)}/5`)],
      [t('rows.score.label'), ...columns.map((c) => `${c.score}/100`)],
    ];
    const csv = buildCsv(header, rows);
    const name = t('export.fileName', { code: rfq.code });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t('common:toast.exported', { name }), 'success');
  };

  const confirmAward = () => {
    if (!awardTarget) return;
    const name = awardTarget.supplier.name;
    award.mutate(awardTarget.quotation.id, {
      onSuccess: () => {
        toast(t('award.success', { name }), 'success');
        setAwardTarget(null);
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    });
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    const name = rejectTarget.supplier.name;
    reject.mutate(
      { quotationId: rejectTarget.quotation.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast(t('reject.success', { name }), 'success');
          setRejectTarget(null);
          setReason('');
        },
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        className="!mb-0"
        breadcrumbs={[
          { label: t('breadcrumb.rfqs'), to: '/buyer/rfqs' },
          { label: `${rfq.code}: ${rfq.title}`, to: `/buyer/rfqs/${rfq.id}` },
          { label: t('breadcrumb.comparison') },
        ]}
        title={t('title', { count: data.quotations.length })}
        badge={<span className="whitespace-nowrap rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-label-sm text-primary">{t('rfqCode', { code: rfq.code })}</span>}
        subtitle={
          <span className="text-body-sm">
            {specLine}
            {specLine && ' • '}
            {t('orderQty', { qty: f.number(rfq.quantity), unit: rfq.unit })}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" leftIcon="download" onClick={exportCsv} disabled={columns.length === 0}>
              {t('actions.export')}
            </Button>
            <Button variant="secondary" leftIcon="bookmark_add" onClick={() => toast(t('common:states.notSupported'), 'info')}>
              {t('actions.save')}
            </Button>
            <Button leftIcon="check_circle" disabled={!decisionsOpen || !result.recommended} onClick={() => setAwardTarget(result.recommended)}>
              {t('actions.markSelected')}
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        {awarded && winnerName && (
          <Callout tone="success" icon="emoji_events" title={t('awardedBanner.title', { name: winnerName, date: rfq.awardedAt ? f.date(rfq.awardedAt) : '' })}>
            {t('awardedBanner.desc')}{' '}
            <Link to={`/buyer/rfqs/${rfq.id}`} className="font-semibold text-primary hover:underline">
              {t('awardedBanner.back')}
            </Link>
          </Callout>
        )}
        {rfq.lifecycle === 'cancelled' && <Callout tone="danger" title={t('cancelledBanner')} />}

        {columns.length === 0 ? (
          <Card>
            <EmptyState
              icon="compare_arrows"
              title={t('empty.title')}
              description={t('empty.desc', { min: MIN_QUOTES_TO_COMPARE })}
              action={
                <ButtonLink variant="secondary" leftIcon="arrow_back" to={`/buyer/rfqs/${rfq.id}`}>
                  {t('empty.back')}
                </ButtonLink>
              }
            />
          </Card>
        ) : (
          <>
            {columns.length < MIN_QUOTES_TO_COMPARE && <Callout tone="warning">{t('fewQuotes', { min: MIN_QUOTES_TO_COMPARE })}</Callout>}
            {result.recommended && <RecommendationBanner rfq={rfq} result={result} />}
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 bg-surface-bright px-4 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-label-lg font-bold text-on-surface">{t('matrix.title')}</h2>
                  <span className="rounded bg-surface-container px-2 py-0.5 text-body-sm text-on-surface-variant">{t('matrix.normalized', { count: columns.length })}</span>
                </div>
                <div className="flex items-center gap-2" role="group" aria-label={t('matrix.mode')}>
                  <span className="text-body-sm font-medium text-on-surface-variant">{t('matrix.mode')}</span>
                  {(['all', 'diff'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={clsx(
                        'rounded px-2.5 py-1 text-body-sm transition-colors',
                        mode === m ? 'bg-surface-container-high font-semibold text-primary' : 'font-medium text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {t(`matrix.modes.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
              {(restricted || rejectedHidden > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-outline-variant/60 bg-surface-container-low px-4 py-2 text-body-sm text-on-surface-variant sm:px-6">
                  {restricted && (
                    <span>
                      {t('matrix.restricted', { shown: columns.length })}{' '}
                      <Link to={`/buyer/rfqs/${rfq.id}/compare`} className="font-semibold text-primary hover:underline">
                        {t('matrix.showAll')}
                      </Link>
                    </span>
                  )}
                  {rejectedHidden > 0 && <span>{t('matrix.rejectedHidden', { count: rejectedHidden })}</span>}
                </div>
              )}
              <Matrix
                rfq={rfq}
                columns={columns}
                highlightId={highlightId}
                reference={reference}
                mode={mode}
                decisionsOpen={decisionsOpen}
                onAward={setAwardTarget}
                onReject={(c) => {
                  setReason('');
                  setRejectTarget(c);
                }}
                onView={setViewing}
              />
            </Card>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 pt-3 text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-2">
            <Icon name="lock" size={16} className="text-success" />
            {t('footer.security')}
          </span>
          <span>{t('footer.sealed')}</span>
        </footer>
      </div>

      <ConfirmDialog
        open={awardTarget !== null}
        onClose={() => setAwardTarget(null)}
        onConfirm={confirmAward}
        loading={award.isPending}
        title={t('award.title', { name: awardTarget?.supplier.name ?? '' })}
        confirmLabel={t('award.confirm')}
      >
        {awardTarget && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3">
              <KeyValue label={t('award.unitPrice')} value={t('perUnit', { price: f.money(awardTarget.quotation.unitPrice), unit: rfq.unit })} />
              <KeyValue label={t('award.total', { qty: f.number(awardTarget.effectiveQuantity), unit: rfq.unit })} value={<span className="font-semibold text-primary">{f.money(awardTarget.total)}</span>} />
              <KeyValue label={t('award.leadTime')} value={t('common:time.workingDays', { count: awardTarget.quotation.leadTimeDays })} />
              <KeyValue label={t('award.score')} value={`${awardTarget.score}/100`} />
            </dl>
            <Callout tone="info" title={t('award.whatHappens')}>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>{t('award.effect1', { code: rfq.code })}</li>
                <li>{t('award.effect2')}</li>
                <li>{t('award.effect3')}</li>
              </ul>
            </Callout>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        loading={reject.isPending}
        tone="danger"
        title={t('reject.title', { name: rejectTarget?.supplier.name ?? '' })}
        description={t('reject.desc')}
        confirmLabel={t('reject.confirm')}
      >
        <Field label={t('reject.reason')} htmlFor="reject-reason" hint={t('reject.reasonHint')}>
          <Textarea id="reject-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reject.placeholder')} />
        </Field>
      </ConfirmDialog>

      <QuoteDetailModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        quotation={viewing?.quotation ?? null}
        supplierName={viewing?.supplier.name ?? ''}
        supplierLocation={viewing?.supplier.locationLabel}
        quantity={rfq.quantity}
        unit={rfq.unit}
      />
    </>
  );
}

function certList(c: ComparedQuote): string[] {
  return mergeCertifications(c.supplier.certifications, c.quotation.certifications);
}

// ---------------------------------------------------------------------------
// Recommendation banner
// ---------------------------------------------------------------------------

function RecommendationBanner({ rfq, result }: { rfq: Rfq; result: ComparisonResult }) {
  const { t } = useTranslation('comparison');
  const f = useFormat();
  const rec = result.recommended!;
  const low = result.lowestUnitPrice;
  const unit = rfq.unit;
  const w = rfq.terms.weights;
  const strong = <strong className="font-semibold text-on-surface tabular-nums" />;
  const accent = <strong className="font-semibold text-primary" />;
  const extra = rec.quotation.toolingCost === 0 ? t('reco.toolingFree') : '';
  const recValues = {
    name: rec.supplier.name,
    score: rec.score,
    price: t('perUnit', { price: f.money(rec.quotation.unitPrice), unit }),
    total: f.money(rec.total),
    days: rec.quotation.leadTimeDays,
    extra,
  };
  const lowIsRec = !low || low.quotation.id === rec.quotation.id;

  return (
    <section className="relative overflow-hidden rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF]/70 via-surface-container-lowest to-[#EFF6FF]/40 p-4 shadow-sm">
      <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-primary" aria-hidden />
      <div className="flex items-start gap-3.5 pl-1">
        <span className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-primary-fixed p-2 text-primary">
          <Icon name="auto_awesome" filled />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-headline-sm font-bold text-on-surface">{t('reco.title')}</h2>
            <span className="whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary">
              {t('reco.scoreChip', { name: rec.supplier.shortName, score: rec.score })}
            </span>
          </div>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            {!lowIsRec && low && (
              <>
                <Trans
                  t={t}
                  i18nKey={low.moqFit ? 'reco.lowestFit' : 'reco.lowestMoq'}
                  values={{
                    name: low.supplier.name,
                    price: t('perUnit', { price: f.money(low.quotation.unitPrice), unit }),
                    moq: `${f.number(low.quotation.moq)} ${unit}`,
                    total: f.money(low.total),
                    overBudget: low.withinBudget === false ? t('reco.overBudget') : '',
                  }}
                  components={{ b: strong }}
                />{' '}
              </>
            )}
            <Trans t={t} i18nKey={lowIsRec ? 'reco.recommendedIsLowest' : 'reco.recommended'} values={recValues} components={{ b: strong, hl: accent }} />
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[#DBEAFE] pt-2 text-label-sm">
            <Highlight icon="verified" iconClass="text-success" label={t('reco.bestBudget')}>
              {result.bestBudget ? `${result.bestBudget.supplier.shortName} (${f.money(result.bestBudget.total)})` : t('reco.noneFits')}
            </Highlight>
            {result.fastest && (
              <Highlight icon="schedule" iconClass="text-primary" label={t('reco.fastest')}>
                {`${result.fastest.supplier.shortName} (${t('common:time.days', { count: result.fastest.quotation.leadTimeDays })})`}
              </Highlight>
            )}
            {result.mostFlexiblePayment && (
              <Highlight icon="account_balance_wallet" iconClass="text-primary" label={t('reco.flexiblePayment')}>
                {`${result.mostFlexiblePayment.supplier.shortName} (${result.mostFlexiblePayment.quotation.paymentTerms})`}
              </Highlight>
            )}
          </div>
          <p className="mt-2 text-body-sm text-on-surface-variant">{t('reco.weights', { price: w.price, leadTime: w.leadTime, moq: w.moq, quality: w.quality })}</p>
        </div>
      </div>
    </section>
  );
}

function Highlight({ icon, iconClass, label, children }: { icon: string; iconClass: string; label: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1 text-on-surface-variant">
      <Icon name={icon} size={16} className={iconClass} />
      <span>
        {label} <strong className="text-on-surface">{children}</strong>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

interface MatrixProps {
  rfq: Rfq;
  columns: ComparedQuote[];
  highlightId?: string;
  reference: ComparedQuote | null;
  mode: MatrixMode;
  decisionsOpen: boolean;
  onAward: (c: ComparedQuote) => void;
  onReject: (c: ComparedQuote) => void;
  onView: (c: ComparedQuote) => void;
}

const ROW_ICONS: Record<MatrixRowKey, string> = {
  reliability: 'verified_user',
  unitPrice: 'payments',
  moq: 'inventory_2',
  leadTime: 'local_shipping',
  payment: 'account_balance_wallet',
  validity: 'event_available',
  tooling: 'palette',
  score: 'leaderboard',
};

const stickyCell = 'sticky left-0 z-10 w-[150px] min-w-[150px] bg-surface-container-low p-3 align-top shadow-[1px_0_0_0_theme(colors.outline-variant)] sm:w-[240px] sm:min-w-[240px] sm:p-4';

function Matrix({ rfq, columns, highlightId, reference, mode, decisionsOpen, onAward, onReject, onView }: MatrixProps) {
  const { t } = useTranslation('comparison');
  const f = useFormat();
  const rowKeys = visibleMatrixRows(columns, mode);
  const now = clock.now();
  const unit = rfq.unit;
  const qty = f.number(rfq.quantity);
  const awarded = rfq.lifecycle === 'awarded';
  const daysToNeed = daysBetween(now, rfq.neededBy);

  const cell = (key: MatrixRowKey, c: ComparedQuote): ReactNode => {
    const q = c.quotation;
    switch (key) {
      case 'reliability': {
        const certs = certList(c);
        const audited = c.supplier.audit?.result === 'passed';
        return (
          <div className="flex flex-col gap-1">
            <span className={clsx('flex items-center gap-1.5 text-label-sm', audited || c.supplier.verified ? 'text-success' : 'text-on-surface-variant')}>
              <Icon name={audited || c.supplier.verified ? 'check_circle' : 'help'} size={16} />
              {audited ? t('rows.reliability.audited') : c.supplier.verified ? t('rows.reliability.verified') : t('rows.reliability.unverified')}
            </span>
            <span className="text-body-sm text-on-surface-variant">{certs.length ? certs.join(', ') : t('common:labels.none')}</span>
            {c.missingCertifications.length > 0 && (
              <span className="text-label-sm text-danger">{t('rows.reliability.missing', { certs: c.missingCertifications.join(', ') })}</span>
            )}
            <span className="mt-0.5 flex flex-wrap items-center gap-1 text-label-sm font-bold text-warning">
              <Icon name="star" filled size={14} className="text-[#F59E0B]" />
              {`${c.supplier.rating.toFixed(1)}/5.0`}
              <span className="font-normal text-on-surface-variant">({t('rows.reliability.completed', { count: c.supplier.completedRfqCount })})</span>
            </span>
          </div>
        );
      }
      case 'unitPrice': {
        const lowest = c.flags.lowestUnitPrice && distinctive(columns, (r) => r.flags.lowestUnitPrice);
        const forced = c.moqExcess > 0;
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className={clsx('text-headline-md font-bold tabular-nums', lowest ? 'text-success' : c.quotation.id === highlightId ? 'text-primary' : 'text-on-surface')}>
                {f.money(q.unitPrice)}
              </span>
              <span className="text-body-sm text-on-surface-variant">/ {unit}</span>
              {lowest && (
                <Badge tone="success" className="rounded">
                  {t('rows.unitPrice.lowest')}
                </Badge>
              )}
            </div>
            <div className="rounded border border-outline-variant/60 bg-surface-container-low p-2">
              <p className={clsx('text-body-sm', forced ? 'font-medium text-danger' : 'text-on-surface-variant')}>
                {forced ? t('rows.unitPrice.totalForced', { qty: f.number(c.effectiveQuantity), unit }) : t('rows.unitPrice.totalFor', { qty, unit })}
              </p>
              <p className={clsx('text-headline-sm font-bold tabular-nums', forced ? 'text-danger' : 'text-on-surface')}>{f.money(c.total)}</p>
              {c.withinBudget === false && <p className="text-label-sm text-danger">{t('rows.unitPrice.overBudget')}</p>}
            </div>
          </div>
        );
      }
      case 'moq':
        return (
          <div className="space-y-1.5">
            <span className={clsx('block text-headline-sm font-bold tabular-nums', c.moqFit ? 'text-on-surface' : 'text-danger')}>{`${f.number(q.moq)} ${unit}`}</span>
            {c.moqFit ? (
              <Badge tone="success" icon="task_alt">
                {t('rows.moq.fit', { qty })}
              </Badge>
            ) : (
              <Badge tone="warning" icon="warning">
                {t('rows.moq.over', { excess: f.number(c.moqExcess), unit })}
              </Badge>
            )}
          </div>
        );
      case 'leadTime': {
        const fastest = c.flags.fastest && distinctive(columns, (r) => r.flags.fastest);
        const slower = reference && c !== reference ? q.leadTimeDays - reference.quotation.leadTimeDays : 0;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('text-label-lg font-bold', fastest ? 'text-primary' : 'text-on-surface')}>{t('common:time.workingDays', { count: q.leadTimeDays })}</span>
            {fastest ? (
              <Badge tone="info" className="rounded">
                {t('rows.leadTime.fastest')}
              </Badge>
            ) : slower > 0 ? (
              <span className="text-body-sm font-medium text-warning">{t('rows.leadTime.slower', { count: slower })}</span>
            ) : q.leadTimeDays <= daysToNeed ? (
              <span className="text-body-sm text-on-surface-variant">{t('rows.leadTime.onTime')}</span>
            ) : (
              <span className="text-body-sm font-medium text-danger">{t('rows.leadTime.late')}</span>
            )}
          </div>
        );
      }
      case 'payment': {
        const flexible = c.flags.mostFlexiblePayment && distinctive(columns, (r) => r.flags.mostFlexiblePayment);
        const icon = c.paymentFlexibility === 1 ? 'warning' : c.paymentFlexibility === 3 ? 'verified' : 'check';
        const iconClass = c.paymentFlexibility === 1 ? 'text-warning' : c.paymentFlexibility === 3 ? 'text-success' : 'text-primary';
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <Icon name={icon} size={18} className={clsx('mt-0.5', iconClass)} label={c.paymentFlexibility === 1 ? t('rows.payment.prepay') : undefined} />
              <span className="text-body-md font-medium text-on-surface">{q.paymentTerms}</span>
            </div>
            {flexible && (
              <Badge tone="success" className="w-fit rounded">
                {t('rows.payment.best')}
              </Badge>
            )}
          </div>
        );
      }
      case 'validity': {
        const left = validityDaysLeft(c, now);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-label-lg font-bold text-on-surface">{t('common:time.days', { count: q.validityDays })}</span>
            <span className="text-body-sm text-on-surface-variant">{t('rows.validity.untilShort', { date: f.date(c.validUntil) })}</span>
            {left < 0 ? (
              <Badge tone="neutral" className="w-fit">
                {t('rows.validity.expired')}
              </Badge>
            ) : (
              left <= EXPIRING_SOON_DAYS && (
                <Badge tone="danger" icon="timer" className="w-fit">
                  {t('rows.validity.soon', { count: left })}
                </Badge>
              )
            )}
          </div>
        );
      }
      case 'tooling':
        return q.toolingCost === 0 ? (
          <div className="flex items-start gap-1.5 font-semibold text-on-surface">
            <Icon name="check_circle" size={18} className="mt-px text-success" />
            <span>{q.toolingNote || t('rows.tooling.free')}</span>
          </div>
        ) : (
          <div className="text-on-surface">
            <span className="font-medium">{t('rows.tooling.cost', { cost: f.money(q.toolingCost) })}</span>
            {q.toolingNote && <span className="mt-0.5 block text-body-sm text-on-surface-variant">{q.toolingNote}</span>}
          </div>
        );
      case 'score':
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1">
              <span className={clsx('text-headline-md font-bold tabular-nums', c.quotation.id === highlightId ? 'text-primary' : 'text-on-surface')}>{c.score}</span>
              <span className="text-body-sm text-on-surface-variant">/100</span>
              <span className="ml-auto text-label-sm text-on-surface-variant">{t('rows.score.rank', { rank: c.rank })}</span>
            </div>
            <ProgressBar value={c.score / 100} tone={c.quotation.id === highlightId ? 'primary' : 'navy'} label={t('rows.score.label')} />
          </div>
        );
    }
  };

  const colClass = (c: ComparedQuote) => clsx('p-3 align-top sm:p-4', c.quotation.id === highlightId && 'bg-[#F5F9FF]');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body-md" style={{ minWidth: 220 + columns.length * 240 }}>
        <thead>
          <tr className="divide-x divide-outline-variant/40 border-b border-outline-variant/80">
            <th scope="col" className={clsx(stickyCell, 'align-middle text-headline-sm font-bold text-on-surface')}>
              {t('matrix.criteria')}
            </th>
            {columns.map((c, i) => {
              const isHighlight = c.quotation.id === highlightId;
              const isWinner = awarded && c.quotation.id === rfq.awardedQuotationId;
              return (
                <th key={c.quotation.id} scope="col" className={clsx('p-3 align-top font-normal sm:p-4', isHighlight ? 'border-t-2 border-t-primary bg-[#EFF6FF]/70' : 'bg-surface-bright')}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      {isWinner ? (
                        <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{t('matrix.selected')}</span>
                      ) : isHighlight ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">{t('matrix.recommended')}</span>
                      ) : (
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          {t('matrix.supplierLetter', { letter: String.fromCharCode(65 + i) })}
                        </span>
                      )}
                      <Icon name={isWinner ? 'emoji_events' : isHighlight ? 'star' : 'domain'} filled={isHighlight} size={18} className={isWinner ? 'text-success' : isHighlight ? 'text-primary' : 'text-outline'} />
                    </div>
                    <span className="text-headline-sm font-bold text-on-surface">{c.supplier.name}</span>
                    <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      <Icon name="location_on" size={14} />
                      {c.supplier.locationLabel}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {rowKeys.map((key) => (
            <tr key={key} className="divide-x divide-outline-variant/40">
              <th scope="row" className={clsx(stickyCell, 'font-normal')}>
                <div className="flex items-start gap-2">
                  <Icon name={ROW_ICONS[key]} size={18} className="mt-0.5 text-primary" />
                  <div className="min-w-0">
                    <p className="text-label-lg text-on-surface">{t(`rows.${key}.label`, { unit })}</p>
                    <p className="text-body-sm text-on-surface-variant">{t(`rows.${key}.sub`, { qty, unit })}</p>
                  </div>
                </div>
              </th>
              {columns.map((c) => (
                <td key={c.quotation.id} className={colClass(c)}>
                  {cell(key, c)}
                </td>
              ))}
            </tr>
          ))}
          {rowKeys.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="p-6 text-center text-body-md text-on-surface-variant">
                {t('matrix.noDifferences')}
              </td>
            </tr>
          )}
          <tr className="divide-x divide-outline-variant/40 bg-surface-bright">
            <th scope="row" className={clsx(stickyCell, 'font-normal')}>
              <p className="text-label-lg text-on-surface">{t('rows.actions.label')}</p>
              <p className="text-body-sm text-on-surface-variant">{t('rows.actions.sub')}</p>
            </th>
            {columns.map((c) => {
              const isHighlight = c.quotation.id === highlightId;
              const isWinner = awarded && c.quotation.id === rfq.awardedQuotationId;
              return (
                <td key={c.quotation.id} className={clsx(colClass(c), isHighlight && '!bg-[#EFF6FF]/70')}>
                  <div className="flex flex-col gap-2">
                    {decisionsOpen && (
                      <Button variant={isHighlight ? 'primary' : 'outline'} leftIcon="how_to_reg" fullWidth onClick={() => onAward(c)}>
                        {t('rows.actions.select')}
                      </Button>
                    )}
                    {!decisionsOpen && (
                      <div className="flex justify-center">
                        {isWinner ? (
                          <Badge tone="success" icon="emoji_events">
                            {t('rows.actions.winner')}
                          </Badge>
                        ) : (
                          <QuotationStatusBadge status={c.quotation.status} />
                        )}
                      </div>
                    )}
                    <Button variant="secondary" leftIcon="visibility" fullWidth onClick={() => onView(c)}>
                      {t('rows.actions.view')}
                    </Button>
                    {decisionsOpen && (
                      <Button variant="ghost" size="xs" className="mx-auto font-normal hover:!bg-transparent hover:text-danger" onClick={() => onReject(c)}>
                        {t('rows.actions.reject')}
                      </Button>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
