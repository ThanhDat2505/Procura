import clsx from 'clsx';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DeadlineBadge,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Input,
  LoadingState,
  MenuItem,
  Pagination,
  Popover,
  RfqStatusBadge,
  Select,
  Table,
  Tabs,
  Td,
  Th,
  THead,
  Tr,
  useToast,
  type TabItem,
} from '@/components/ui';
import { CATEGORIES } from '@/domain/catalog';
import { clock } from '@/domain/clock';
import type { Rfq } from '@/domain/types';
import { useCancelRfq, useDuplicateRfq, useRfqList } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { RfqListItem, RfqListParams } from '@/services';
import { resumeStep } from '../rfq-wizard/wizardHelpers';
import { paginateLocal, toCsv } from './listHelpers';

type ListTab = 'all' | 'draft' | 'open' | 'awaiting' | 'quoted' | 'awarded' | 'closed';

const PAGE_SIZE = 8;
const DEADLINE_OPTIONS = [3, 7, 14];

const editPath = (rfq: Rfq) => `/buyer/rfqs/${rfq.id}/edit/${resumeStep(rfq.completedStep)}`;
const rowPath = (item: RfqListItem) => (item.status === 'draft' ? editPath(item.rfq) : `/buyer/rfqs/${item.rfq.id}`);

function ListStat({ label, value, valueClass, aside, footer, footerClass, dotClass }: { label: string; value: number; valueClass?: string; aside: ReactNode; footer: string; footerClass?: string; dotClass: string }) {
  return (
    <Card padding="sm" className="flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-body-sm font-medium text-on-surface-variant">{label}</span>
          <div className={clsx('mt-1 text-display-sm tabular-nums', valueClass ?? 'text-on-surface')}>{value}</div>
        </div>
        {aside}
      </div>
      <p className={clsx('mt-3 flex items-center gap-1.5 text-body-sm', footerClass ?? 'text-outline')}>
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden />
        {footer}
      </p>
    </Card>
  );
}

function StatIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low', className)}>
      <Icon name={name} size={20} />
    </span>
  );
}

export default function RfqListPage() {
  const { t } = useTranslation('rfqList');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ListTab>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState('');
  const [within, setWithin] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Rfq | null>(null);

  const combined = tab === 'closed';
  const params: RfqListParams = {
    tab: combined ? 'all' : tab,
    query: deferredQuery.trim() || undefined,
    categoryId: categoryId || undefined,
    ownerId: ownerId || undefined,
    deadlineWithinDays: within ? Number(within) : undefined,
    // The combined "expired + cancelled" tab is filtered and paginated here, so fetch everything.
    page: combined ? 1 : page,
    pageSize: combined ? 1000 : PAGE_SIZE,
  };
  const list = useRfqList(params);
  const cancel = useCancelRfq();
  const duplicate = useDuplicateRfq();

  const data = list.data;
  const closedItems = useMemo(() => (combined ? (data?.items ?? []).filter((i) => i.status === 'expired' || i.status === 'cancelled') : []), [combined, data]);
  const rows = combined ? paginateLocal(closedItems, page, PAGE_SIZE) : (data?.items ?? []);
  const total = combined ? closedItems.length : (data?.total ?? 0);

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const counts = data?.counts;
  const tabs: TabItem<ListTab>[] = [
    { value: 'all', label: t('tabs.all'), count: counts?.all },
    { value: 'draft', label: t('common:rfqStatus.draft'), count: counts?.draft },
    { value: 'open', label: t('common:rfqStatus.open'), count: counts?.open },
    { value: 'awaiting', label: t('common:rfqStatus.awaiting'), count: counts?.awaiting },
    { value: 'quoted', label: t('common:rfqStatus.quoted'), count: counts?.quoted },
    { value: 'awarded', label: t('common:rfqStatus.awarded'), count: counts?.awarded },
    { value: 'closed', label: t('tabs.closed'), count: counts ? counts.expired + counts.cancelled : undefined },
  ];

  const exportCsv = () => {
    const header = [t('table.code'), t('table.title'), t('table.category'), t('table.quantity'), t('table.unit'), t('table.invited'), t('table.quotes'), t('table.deadline'), t('table.status'), t('table.owner')];
    const body = rows.map((i) => [
      i.rfq.code,
      i.rfq.title,
      t(`common:categories.${i.rfq.categoryId}`),
      i.rfq.quantity,
      i.rfq.unit,
      i.invitedCount,
      i.quoteCount,
      i.status === 'draft' ? '' : f.dateTime(i.rfq.deadline),
      t(`common:rfqStatus.${i.status}`),
      i.owner.name,
    ]);
    const name = `procura-rfq-${f.date(clock.now()).replace(/\//g, '-')}.csv`;
    const url = URL.createObjectURL(new Blob([toCsv([header, ...body])], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('common:toast.exported', { name }));
  };

  const errorText = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    return code ? t(`common:${code}`, { defaultValue: t('common:errors.generic') }) : t('common:errors.generic');
  };

  const onDuplicate = (rfq: Rfq) =>
    duplicate.mutate(rfq.id, {
      onSuccess: (copy) => {
        toast(t('toast.duplicated', { code: copy.code }));
        navigate(`/buyer/rfqs/${copy.id}/edit/1`);
      },
      onError: (e) => toast(errorText(e), 'error'),
    });

  const onConfirmCancel = () => {
    if (!cancelTarget) return;
    const code = cancelTarget.code;
    cancel.mutate(cancelTarget.id, {
      onSuccess: () => {
        toast(t('toast.cancelled', { code }));
        setCancelTarget(null);
      },
      onError: (e) => {
        toast(errorText(e), 'error');
        setCancelTarget(null);
      },
    });
  };

  const stats = data?.stats;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-headline-lg text-on-surface">{t('title')}</h1>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('subtitle')}</p>
        </div>
        <ButtonLink to="/buyer/rfqs/new" leftIcon="add">
          {t('common:actions.createRfq')}
        </ButtonLink>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <ListStat label={t('stats.open')} value={stats?.open ?? 0} aside={<StatIcon name="mark_email_unread" className="text-primary" />} footer={t('stats.openHint')} dotClass="bg-primary" />
        <ListStat
          label={t('stats.awaitingDecision')}
          value={stats?.awaitingDecision ?? 0}
          valueClass="text-primary"
          aside={<span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">{t('stats.priority')}</span>}
          footer={t('stats.awaitingDecisionHint')}
          footerClass="font-medium text-primary"
          dotClass="bg-primary"
        />
        <ListStat
          label={t('stats.dueSoon')}
          value={stats?.dueSoon ?? 0}
          valueClass="text-danger"
          aside={<span className="whitespace-nowrap rounded-full bg-danger-container px-2 py-0.5 text-label-sm text-danger">{t('stats.urgent')}</span>}
          footer={t('stats.dueSoonHint')}
          footerClass="text-danger"
          dotClass="bg-danger"
        />
        <ListStat label={t('stats.awardedThisMonth')} value={stats?.awardedThisMonth ?? 0} aside={<StatIcon name="verified" className="text-on-surface-variant" />} footer={t('stats.awardedHint')} dotClass="bg-outline" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <Tabs items={tabs} value={tab} onChange={resetPage(setTab)} className="px-4" ariaLabel={t('tabsLabel')} />

        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <Input
              leftIcon="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t('filters.searchPlaceholder')}
              aria-label={t('filters.searchPlaceholder')}
              className="w-full sm:w-auto sm:min-w-[260px] sm:max-w-sm sm:flex-1"
            />
            <Select value={categoryId} onChange={(e) => resetPage(setCategoryId)(e.target.value)} aria-label={t('filters.category')} className="w-full sm:w-auto">
              <option value="">{t('filters.categoryAll')}</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(`common:${c.labelKey}`)}
                </option>
              ))}
            </Select>
            <Select value={within} onChange={(e) => resetPage(setWithin)(e.target.value)} aria-label={t('filters.deadline')} className="w-full sm:w-auto">
              <option value="">{t('filters.deadlineAll')}</option>
              {DEADLINE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {t('filters.deadlineWithin', { count: d })}
                </option>
              ))}
            </Select>
            <Select value={ownerId} onChange={(e) => resetPage(setOwnerId)(e.target.value)} aria-label={t('filters.owner')} className="w-full sm:w-auto">
              <option value="">{t('filters.ownerAll')}</option>
              {(data?.owners ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {t('filters.ownerOption', { name: o.name })}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" leftIcon="download" onClick={exportCsv} disabled={rows.length === 0}>
            {t('common:actions.export')}
          </Button>
        </div>

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} className="border-t border-outline-variant" />
        ) : !data ? (
          <LoadingState rows={5} className="border-t border-outline-variant p-4" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="request_quote"
            title={t('empty.title')}
            description={t('empty.description')}
            className="border-t border-outline-variant"
            action={
              <ButtonLink to="/buyer/rfqs/new" leftIcon="add">
                {t('common:actions.createRfq')}
              </ButtonLink>
            }
          />
        ) : (
          <Table minWidth={1240} className={clsx('border-t border-outline-variant', list.isFetching && 'opacity-70')}>
            <THead>
              <tr>
                <Th>{t('table.codeTitle')}</Th>
                <Th className="!px-3">{t('table.category')}</Th>
                <Th className="!px-3 text-right">{t('table.quantity')}</Th>
                <Th className="!px-3 text-center">{t('table.invited')}</Th>
                <Th className="!px-3 text-center">{t('table.quotes')}</Th>
                <Th className="!px-3">{t('table.deadline')}</Th>
                <Th className="!px-3">{t('table.status')}</Th>
                <Th className="!px-3">{t('table.owner')}</Th>
                <Th className="text-right">{t('table.actions')}</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map((item, index) => (
                <RfqRow key={item.rfq.id} item={item} openUp={rows.length > 2 && index >= rows.length - 2} onOpen={() => navigate(rowPath(item))} onDuplicate={() => onDuplicate(item.rfq)} onCancel={() => setCancelTarget(item.rfq)} />
              ))}
            </tbody>
          </Table>
        )}

        {data && total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="border-t border-outline-variant p-3.5" />}
      </Card>

      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={onConfirmCancel}
        tone="danger"
        loading={cancel.isPending}
        title={t('cancelDialog.title', { code: cancelTarget?.code ?? '' })}
        description={t('cancelDialog.description')}
        confirmLabel={t('cancelDialog.confirm')}
      />
    </>
  );
}

function RfqRow({ item, openUp, onOpen, onDuplicate, onCancel }: { item: RfqListItem; openUp: boolean; onOpen: () => void; onDuplicate: () => void; onCancel: () => void }) {
  const { t } = useTranslation('rfqList');
  const f = useFormat();
  const { rfq, status } = item;
  const isDraft = status === 'draft';
  const live = status === 'open' || status === 'awaiting' || status === 'quoted';

  const action = isDraft ? (
    <ButtonLink to={editPath(rfq)} variant="secondary" size="sm">
      {t('actions.continueDraft')}
    </ButtonLink>
  ) : status === 'quoted' ? (
    <ButtonLink to={`/buyer/rfqs/${rfq.id}/compare`} size="sm">
      {t('actions.compareNow')}
    </ButtonLink>
  ) : status === 'awarded' ? (
    <ButtonLink to={`/buyer/rfqs/${rfq.id}/compare`} variant="secondary" size="sm">
      {t('actions.viewResult')}
    </ButtonLink>
  ) : (
    <ButtonLink to={`/buyer/rfqs/${rfq.id}`} variant="secondary" size="sm">
      {t('common:actions.viewDetail')}
    </ButtonLink>
  );

  return (
    <Tr onClick={onOpen} className="h-12">
      <Td className="!py-1.5">
        <div className="flex flex-col">
          <Link to={rowPath(item)} onClick={(e) => e.stopPropagation()} className={clsx('text-label-md hover:underline', isDraft ? 'text-on-surface-variant' : 'text-primary')}>
            {rfq.code}
          </Link>
          <span className="max-w-[280px] truncate font-semibold text-on-surface" title={rfq.title}>
            {rfq.title || <span className="font-normal italic text-outline">{t('untitled')}</span>}
          </span>
        </div>
      </Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5 text-on-surface-variant">{t(`common:categories.${rfq.categoryId}`)}</Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5 text-right font-medium">
        {f.number(rfq.quantity)} {rfq.unit}
      </Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5 text-center">{t('table.invitedValue', { count: item.invitedCount })}</Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5 text-center">
        {isDraft ? (
          <span className="text-on-surface-variant">0/0</span>
        ) : (
          <>
            <span className="font-bold text-primary">
              {item.quoteCount}/{item.invitedCount}
            </span>{' '}
            <span className="text-on-surface-variant">{t('table.quotesSuffix')}</span>
          </>
        )}
      </Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5">
        {isDraft ? (
          <span className="italic text-outline">{t('table.notPublished')}</span>
        ) : status === 'awarded' ? (
          <span className="text-on-surface-variant">{t('table.closedBidding')}</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className={live ? 'text-on-surface' : 'text-on-surface-variant'}>{f.dateTime(rfq.deadline)}</span>
            {live && <DeadlineBadge deadline={rfq.deadline} className="rounded-full px-2" />}
          </span>
        )}
      </Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5">
        <RfqStatusBadge status={status} />
      </Td>
      <Td className="whitespace-nowrap !px-3 !py-1.5 font-medium text-on-surface-variant">{item.owner.name}</Td>
      <Td className="whitespace-nowrap !py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {action}
          <Popover
            className={clsx('w-44 py-1', openUp && '!bottom-full !top-auto !mb-1 !mt-0')}
            trigger={({ open, toggle, id }) => <IconButton icon="more_vert" label={t('actions.more')} onClick={toggle} aria-expanded={open} aria-controls={id} aria-haspopup="menu" />}
          >
            {(close) => (
              <div role="menu">
                <MenuItem
                  icon="content_copy"
                  onClick={() => {
                    close();
                    onDuplicate();
                  }}
                >
                  {t('actions.duplicate')}
                </MenuItem>
                {status !== 'awarded' && status !== 'cancelled' && (
                  <MenuItem
                    icon="block"
                    tone="danger"
                    onClick={() => {
                      close();
                      onCancel();
                    }}
                  >
                    {t('actions.cancel')}
                  </MenuItem>
                )}
              </div>
            )}
          </Popover>
        </div>
      </Td>
    </Tr>
  );
}
