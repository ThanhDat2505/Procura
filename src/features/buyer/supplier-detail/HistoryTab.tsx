import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge, type BadgeTone, Button, ButtonLink, Callout, Card, EmptyState, ErrorState, Icon, LoadingState, RatingStars, StatCard, Table, Td, Th, THead, Tr, useToast } from '@/components/ui';
import { useSupplier, useSupplierHistory } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { HistoryOutcome, InternalRating } from '@/services';
import { formatScore, newRfqWithSupplier, ScoreBar, useSupplierId } from './shared';
import { ratio } from './supplierDetail';

const outcomeTones: Record<HistoryOutcome, BadgeTone> = {
  awarded: 'success',
  not_selected: 'neutral',
  pending: 'warning',
  no_response: 'danger',
};

/** BUY-03c — "Lịch sử báo giá & RFQ" of the signed-in buyer's company with this supplier. */
export default function HistoryTab() {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const supplierId = useSupplierId();
  const supplier = useSupplier(supplierId);
  const history = useSupplierHistory(supplierId);

  if (history.isPending || supplier.isPending) return <LoadingState />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={() => void supplier.refetch()} />;

  const { stats, rows, internalRating } = history.data;
  const s = supplier.data;

  return (
    <section className="flex flex-col gap-6" aria-label={t('tabs.history')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('history.stats.invited')} value={stats.invited} unit={t('history.stats.times')} icon="outgoing_mail" />
        <StatCard
          label={t('history.stats.quoted')}
          value={stats.quoted}
          unit={t('history.stats.times')}
          icon="mark_email_read"
          iconTone="success"
          badge={stats.invited > 0 && <Badge tone="success">{t('history.stats.quoteRate', { rate: f.percent(ratio(stats.quoted, stats.invited)) })}</Badge>}
        />
        <StatCard
          label={t('history.stats.awarded')}
          value={stats.awarded}
          unit={t('history.stats.times')}
          icon="workspace_premium"
          badge={stats.quoted > 0 && <Badge tone="info">{t('history.stats.winRate', { rate: f.percent(ratio(stats.awarded, stats.quoted)) })}</Badge>}
        />
        <StatCard label={t('history.stats.avgResponse')} value={stats.avgResponseHours > 0 ? f.number(stats.avgResponseHours, 1) : '—'} unit={t('common:units.hours')} icon="schedule" iconTone="warning" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card padding="none" className="flex min-w-0 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant p-4">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="history" className="text-primary" />
              <h2 className="text-headline-sm text-on-surface">{t('history.table.title', { name: s.shortName })}</h2>
            </div>
            <span className="text-label-sm text-outline">{t('history.table.source')}</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon="history"
              title={t('history.empty.title')}
              description={t('history.empty.description', { name: s.shortName })}
              action={
                <ButtonLink to={newRfqWithSupplier(s.id)} leftIcon="post_add">
                  {t('history.empty.action')}
                </ButtonLink>
              }
            />
          ) : (
            <>
              <Table minWidth={1040}>
                <THead>
                  <tr>
                    <Th>{t('history.table.rfq')}</Th>
                    <Th>{t('history.table.invitedAt')}</Th>
                    <Th className="text-right">{t('history.table.price')}</Th>
                    <Th>{t('history.table.moq')}</Th>
                    <Th>{t('common:labels.leadTime')}</Th>
                    <Th>{t('history.table.outcome')}</Th>
                    <Th>{t('history.table.note')}</Th>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.rfqId}>
                      <Td className="min-w-[220px]">
                        <Link to={`/buyer/rfqs/${r.rfqId}`} className="block whitespace-nowrap text-label-md text-primary hover:underline">
                          {r.code}
                        </Link>
                        <span className="text-body-sm text-on-surface">{r.title}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-on-surface-variant">{f.date(r.invitedAt)}</Td>
                      <Td className="whitespace-nowrap text-right font-semibold text-on-surface">
                        {r.unitPrice !== undefined ? t('history.table.perUnit', { price: f.money(r.unitPrice), unit: r.unit }) : <span className="font-normal text-outline">—</span>}
                      </Td>
                      <Td className="whitespace-nowrap text-on-surface-variant">{r.moq !== undefined ? `${f.number(r.moq)} ${r.unit}` : <span className="text-outline">—</span>}</Td>
                      <Td className="whitespace-nowrap text-on-surface-variant">
                        {r.leadTimeDays !== undefined ? t('common:time.days', { count: r.leadTimeDays }) : <span className="text-outline">—</span>}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <Badge tone={outcomeTones[r.outcome]} dot>
                          {t(`history.outcome.${r.outcome}`)}
                        </Badge>
                      </Td>
                      <Td className="min-w-[220px] max-w-xs text-body-sm text-on-surface-variant">{r.note ?? <span className="text-outline">—</span>}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3 text-label-sm text-outline">{t('history.table.footer', { count: rows.length })}</div>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <InternalRatingCard rating={internalRating} />
          <Callout tone="info" title={t('history.sla.title')}>
            <p className="text-on-surface-variant">{t('history.sla.body', { name: s.shortName, sla: s.responseSla })}</p>
          </Callout>
        </div>
      </div>
    </section>
  );
}

function InternalRatingCard({ rating }: { rating: InternalRating | null }) {
  const { t } = useTranslation('supplierDetail');
  const f = useFormat();
  const toast = useToast();
  const onUpdate = () => toast(t('common:states.notSupported'), 'info');

  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant pb-3">
        <h2 className="flex items-center gap-2 text-headline-sm text-on-surface">
          <Icon name="verified_user" className="text-primary" />
          {t('history.rating.title')}
        </h2>
        <span className="text-label-sm text-outline">{t('overview.interaction.yourCompany')}</span>
      </div>
      {!rating ? (
        <p className="text-body-md text-on-surface-variant">{t('history.rating.empty')}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3.5">
            <div className="flex flex-col">
              <span className="text-label-sm text-outline">{t('history.rating.overall')}</span>
              <span className="text-display-sm font-bold tabular-nums text-primary">
                {formatScore(rating.score)} <span className="text-body-md font-normal text-outline">/ 5.0</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <RatingStars value={rating.score} size={18} />
              {rating.score >= 4.5 && <span className="mt-1 text-label-sm text-success">{t('history.rating.gradeA')}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-label-sm uppercase tracking-wide text-outline">{t('history.rating.breakdown')}</span>
            <ScoreBar label={t('history.rating.criteria.quality')} value={rating.criteria.quality} />
            <ScoreBar label={t('history.rating.criteria.onTime')} value={rating.criteria.onTime} />
            <ScoreBar label={t('history.rating.criteria.price')} value={rating.criteria.price} />
            <ScoreBar label={t('history.rating.criteria.support')} value={rating.criteria.support} />
          </div>
          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
            <span className="text-label-sm uppercase tracking-wide text-outline">{t('history.rating.note')}</span>
            <blockquote className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-sm italic leading-relaxed text-on-surface-variant">“{rating.note}”</blockquote>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-label-sm text-outline">
              <span>{t('history.rating.updatedAt', { date: f.date(rating.updatedAt) })}</span>
              <span>{t('history.rating.updatedBy', { name: rating.updatedBy })}</span>
            </div>
          </div>
        </>
      )}
      <Button variant="secondary" leftIcon="edit_note" fullWidth onClick={onUpdate} className="text-primary">
        {t('history.rating.update')}
      </Button>
    </Card>
  );
}

