import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DeadlineBadge,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  Input,
  LoadingState,
  QuotationStatusBadge,
  Select,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
  THead,
  Tr,
  PageHeader,
  useToast,
} from '@/components/ui';
import { clock } from '@/domain/clock';
import { isPastDeadline } from '@/domain/rfq';
import { useDeclineRfq, useInbox } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import type { InboxItem, InboxTab } from '@/services';
import { downloadCsv, toCsv } from '../quotations/csv';
import { inboxRowAction, inboxRowStatus } from './inboxRow';

const TABS: InboxTab[] = ['new', 'drafting', 'submitted', 'closed'];
type Sort = 'deadline' | 'newest';

const EMPTY_ICONS: Record<InboxTab, string> = { new: 'mark_email_read', drafting: 'edit_note', submitted: 'send', closed: 'inventory_2' };

/** SUP-01 — Hộp thư Yêu cầu Báo giá (RFQ Inbox). */
export default function InboxPage() {
  const { t } = useTranslation('inbox');
  const f = useFormat();
  const toast = useToast();
  const [tab, setTab] = useState<InboxTab>('new');
  const [sort, setSort] = useState<Sort>('deadline');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim());
  const [declineTarget, setDeclineTarget] = useState<InboxItem | null>(null);

  const inbox = useInbox({ tab, query: query || undefined, sort });
  const decline = useDeclineRfq();

  const statusText = (item: InboxItem) => {
    const s = inboxRowStatus(item);
    return s.kind === 'quotation' ? t(`quotationStatus.${s.status}`, { ns: 'common' }) : t(`status.${s.kind}`);
  };

  const exportCsv = () => {
    const items = inbox.data?.items ?? [];
    const rows = [
      [t('csv.code'), t('csv.title'), t('csv.buyer'), t('csv.quantity'), t('csv.unit'), t('csv.delivery'), t('csv.deadline'), t('csv.status')],
      ...items.map((i) => [i.rfq.code, i.rfq.title, i.buyer.name, i.rfq.quantity, i.rfq.unit, i.rfq.deliveryAddress, f.dateTime(i.rfq.deadline), statusText(i)]),
    ];
    const name = `rfq-inbox-${tab}.csv`;
    downloadCsv(name, toCsv(rows));
    toast(t('toast.exported', { ns: 'common', name }), 'success');
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    try {
      await decline.mutateAsync(declineTarget.rfq.id);
      toast(t('decline.success', { code: declineTarget.rfq.code }), 'success');
      setDeclineTarget(null);
    } catch (e) {
      toast(t((e as { code?: string }).code ?? 'errors.generic', { ns: 'common', defaultValue: t('errors.generic', { ns: 'common' }) }), 'error');
    }
  };

  const data = inbox.data;

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <Button variant="secondary" leftIcon="filter_list" aria-expanded={showFilters} aria-controls="inbox-filters" onClick={() => setShowFilters((v) => !v)}>
              {t('actions.advancedFilter')}
            </Button>
            <Button variant="secondary" leftIcon="file_download" onClick={exportCsv} disabled={!data || data.items.length === 0}>
              {t('actions.export')}
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card id="inbox-filters" padding="sm" className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={t('filters.searchLabel')} htmlFor="inbox-search" className="flex-1">
              <Input id="inbox-search" leftIcon="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('filters.searchPlaceholder')} />
            </Field>
            <Button variant="ghost" leftIcon="close" onClick={() => setSearch('')} disabled={!search}>
              {t('filters.clear')}
            </Button>
          </div>
        </Card>
      )}

      {inbox.isLoading ? (
        <LoadingState rows={5} />
      ) : inbox.isError || !data ? (
        <Card>
          <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t('stats.newThisWeek')}
              value={data.stats.newThisWeek}
              unit={t('stats.newUnit')}
              icon="mark_email_unread"
              footer={
                <span className="flex items-center gap-1 text-primary">
                  <Icon name="inbox" size={14} />
                  {t('stats.newFooter', { count: data.counts.new })}
                </span>
              }
            />
            <StatCard
              label={t('stats.drafting')}
              value={data.stats.drafting}
              unit={t('stats.draftingUnit')}
              icon="edit_note"
              iconTone="neutral"
              footer={
                <span className="flex items-center gap-1">
                  <Icon name="history" size={14} />
                  {t('stats.draftingFooter')}
                </span>
              }
            />
            <StatCard
              label={t('stats.dueSoon')}
              value={data.stats.dueSoon}
              valueClassName="text-danger"
              unit={t('stats.dueSoonUnit')}
              icon="timer"
              iconTone="danger"
              footer={
                <span className="flex items-center gap-1 text-danger">
                  <Icon name="warning" size={14} />
                  {t('stats.dueSoonFooter')}
                </span>
              }
            />
            <StatCard
              label={t('stats.responseRate')}
              value={f.percent(data.stats.responseRate)}
              icon="verified"
              iconTone="success"
              footer={
                <span className="flex items-center gap-1">
                  <Icon name="military_tech" size={14} />
                  {t('stats.responseFooter')}
                </span>
              }
            />
          </section>

          <div>
            <div className="flex flex-col gap-2 border-b border-outline-variant md:flex-row md:items-center md:justify-between">
              <Tabs
                ariaLabel={t('tabs.ariaLabel')}
                className="!border-b-0"
                value={tab}
                onChange={setTab}
                items={TABS.map((value) => ({ value, label: t(`tabs.${value}`), count: data.counts[value] }))}
              />
              <div className="flex items-center gap-2 pb-2 md:pb-0">
                <label htmlFor="inbox-sort" className="whitespace-nowrap text-body-sm text-on-surface-variant">
                  {t('sort.label')}
                </label>
                <Select id="inbox-sort" compact value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-56">
                  <option value="deadline">{t('sort.deadline')}</option>
                  <option value="newest">{t('sort.newest')}</option>
                </Select>
              </div>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            {data.items.length === 0 ? (
              <EmptyState
                icon={query ? 'search_off' : EMPTY_ICONS[tab]}
                title={query ? t('states.noResults', { ns: 'common' }) : t(`empty.${tab}.title`)}
                description={query ? t('empty.searchHint') : t(`empty.${tab}.description`)}
              />
            ) : (
              <>
                <Table minWidth={820}>
                  <THead>
                    <tr>
                      <Th>{t('table.buyer')}</Th>
                      <Th>{t('table.rfq')}</Th>
                      <Th className="text-right">{t('table.quantity')}</Th>
                      <Th className="hidden 2xl:table-cell">{t('table.delivery')}</Th>
                      <Th>{t('table.deadline')}</Th>
                      <Th className="text-center">{t('table.status')}</Th>
                      <Th className="text-right">{t('table.actions')}</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {data.items.map((item) => (
                      <InboxRow key={item.rfq.id} item={item} onDecline={() => setDeclineTarget(item)} />
                    ))}
                  </tbody>
                </Table>
                <div className="border-t border-outline-variant bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">
                  {t('table.showing', { count: data.items.length })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={declineTarget !== null}
        onClose={() => setDeclineTarget(null)}
        onConfirm={() => void confirmDecline()}
        title={t('decline.title')}
        description={declineTarget ? t('decline.description', { code: declineTarget.rfq.code, buyer: declineTarget.buyer.name }) : undefined}
        confirmLabel={t('decline.confirm')}
        tone="danger"
        loading={decline.isPending}
      >
        <p className="text-body-md text-on-surface-variant">{t('decline.body')}</p>
      </ConfirmDialog>
    </>
  );
}

function InboxRow({ item, onDecline }: { item: InboxItem; onDecline: () => void }) {
  const { t } = useTranslation('inbox');
  const f = useFormat();
  const { rfq, buyer } = item;
  const status = inboxRowStatus(item);
  const action = inboxRowAction(item);
  const closed = item.tab === 'closed' || isPastDeadline(rfq, clock.now());

  return (
    <Tr>
      <Td className="min-w-[180px]">
        <div className="flex items-center gap-3">
          <Avatar initials={buyer.initials} size="sm" square />
          <div className="min-w-0">
            <p className="text-label-lg text-on-surface">{buyer.name}</p>
            <p className="text-body-sm text-on-surface-variant">{t('table.taxCode', { code: buyer.taxCode })}</p>
          </div>
        </div>
      </Td>
      <Td className="max-w-[180px]">
        <p className="text-label-md tabular-nums text-primary">{rfq.code}</p>
        <p className="truncate font-medium text-on-surface" title={rfq.title}>
          {rfq.title}
        </p>
      </Td>
      <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-on-surface">
        {f.number(rfq.quantity)} {rfq.unit}
      </Td>
      <Td className="hidden 2xl:table-cell">
        <div className="flex items-center gap-1.5 text-body-sm text-on-surface">
          <Icon name="location_on" size={16} className="text-outline" />
          <span className="max-w-[150px] truncate" title={rfq.deliveryAddress}>
            {rfq.deliveryAddress}
          </span>
        </div>
      </Td>
      <Td className="whitespace-nowrap">
        <p className="text-body-sm font-medium tabular-nums text-on-surface">{f.dateTime(rfq.deadline)}</p>
        <div className="mt-0.5">{closed ? <span className="text-body-sm text-on-surface-variant">{t('table.closedNote')}</span> : <DeadlineBadge deadline={rfq.deadline} />}</div>
      </Td>
      <Td className="whitespace-nowrap text-center">
        {status.kind === 'quotation' ? (
          <QuotationStatusBadge status={status.status} />
        ) : (
          <Badge tone={status.kind === 'new' ? 'info' : status.kind === 'drafting' ? 'warning' : status.kind === 'declined' ? 'danger' : 'neutral'} dot>
            {t(`status.${status.kind}`)}
          </Badge>
        )}
      </Td>
      <Td className="whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {action === 'quote' && (
            <>
              <ButtonLink to={`/supplier/inbox/${rfq.id}`} size="sm">
                {t('actions.quoteNow')}
              </ButtonLink>
              <Button variant="ghost" size="sm" onClick={onDecline} className="hover:text-danger">
                {t('actions.decline')}
              </Button>
            </>
          )}
          {action === 'continue' && (
            <ButtonLink to={`/supplier/inbox/${rfq.id}`} variant="outline" size="sm" leftIcon="edit">
              {t('actions.continue')}
            </ButtonLink>
          )}
          {action === 'viewQuotation' && item.quotation && (
            <ButtonLink to={`/supplier/quotations/${item.quotation.id}`} variant="secondary" size="sm">
              {t('actions.viewQuotation')}
            </ButtonLink>
          )}
          {action === 'viewRfq' && (
            <ButtonLink to={`/supplier/inbox/${rfq.id}`} variant="secondary" size="sm" leftIcon="visibility">
              {t('actions.view')}
            </ButtonLink>
          )}
        </div>
      </Td>
    </Tr>
  );
}
