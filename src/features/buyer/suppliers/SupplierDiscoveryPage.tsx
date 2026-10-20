import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Card, EmptyState, ErrorState, Icon, Input, LoadingState, Pagination, Select, useToast } from '@/components/ui';
import { MAX_SUPPLIERS_PER_RFQ } from '@/domain/rfq';
import { EMPTY_SUPPLIER_FILTERS, type SupplierFilters, type SupplierSort } from '@/domain/supplierSearch';
import type { ID, SupplierSummary } from '@/domain/types';
import { useSupplierSearch } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { SupplierCard, leadTimeLabel } from './components/SupplierCard';
import { SupplierFilterPanel } from './components/SupplierFilterPanel';
import { SupplierListTable } from './components/SupplierListTable';
import { useSupplierBookmark } from './components/useSupplierBookmark';
import { downloadCsv, toCsv } from './lib/csv';
import { clearPanelFilters, parseDiscoveryParams, toDiscoveryParams, type DiscoveryState, type DiscoveryView } from './lib/discoveryParams';

const PAGE_SIZE = 6;
const SORTS: SupplierSort[] = ['relevance', 'rating', 'leadTime', 'moq'];

/** BUY-02 — Tìm kiếm / khám phá nhà cung cấp. */
export default function SupplierDiscoveryPage() {
  const { t } = useTranslation('discovery');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseDiscoveryParams(params), [params]);
  const { filters, sort, page, view } = state;

  const search = useSupplierSearch({ filters, sort, page, pageSize: PAGE_SIZE });
  const directory = useSupplierSearch({ filters: EMPTY_SUPPLIER_FILTERS, sort: 'relevance', page: 1, pageSize: 1 });
  const bookmark = useSupplierBookmark();

  const [draft, setDraft] = useState(filters.query);
  useEffect(() => setDraft(filters.query), [filters.query]);

  const [selected, setSelected] = useState<ID[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const panelId = useId();
  const sortId = useId();
  const searchId = useId();

  const update = (patch: Partial<DiscoveryState>, options: { keepPage?: boolean } = {}) => {
    const next = { ...state, ...patch, page: options.keepPage ? (patch.page ?? state.page) : 1 };
    setParams(toDiscoveryParams(next), { replace: !options.keepPage });
  };
  const setFilters = (next: SupplierFilters) => update({ filters: next });

  // Keep the page in range when results shrink (e.g. after unsaving or narrowing filters elsewhere).
  const total = search.data?.total ?? 0;
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (search.data && !search.isPlaceholderData && page > pages) setParams(toDiscoveryParams({ ...state, page: pages }), { replace: true });
  }, [search.data, search.isPlaceholderData, page, total, state, setParams]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, query: draft });
  };

  const toggleSelect = (s: SupplierSummary) => {
    if (selected.includes(s.id)) {
      setSelected(selected.filter((id) => id !== s.id));
      return;
    }
    if (selected.length >= MAX_SUPPLIERS_PER_RFQ) {
      toast(t('common:validation.maxSuppliers'), 'error');
      return;
    }
    setSelected([...selected, s.id]);
  };

  const createRfq = () => navigate(`/buyer/rfqs/new?suppliers=${selected.join(',')}`);

  const toggleFilters = () => {
    setFiltersOpen((open) => !open);
    if (window.matchMedia('(min-width: 1024px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panelRef.current?.focus({ preventScroll: true });
    }
  };

  const exportList = () => {
    const items = search.data?.items ?? [];
    const filename = t('export.filename');
    const csv = toCsv(
      [t('export.name'), t('export.location'), t('common:labels.moq'), t('card.leadTime'), t('common:labels.certifications')],
      items.map((s) => [s.name, s.locationLabel, `${f.number(s.moq)} ${s.moqUnit}`, leadTimeLabel(t, s), s.certifications.join(', ')]),
    );
    downloadCsv(filename, csv);
    toast(t('common:toast.exported', { name: filename }), 'success');
  };

  const items = search.data?.items ?? [];

  return (
    <>
      {/* Title & selection box */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant pb-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-headline-lg text-on-surface">{t('title')}</h1>
            {directory.data && (
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-primary">{t('partnerCount', { count: directory.data.total })}</span>
            )}
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-2 shadow-sm">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5" aria-live="polite">
            <span className={clsx('h-2.5 w-2.5 rounded-full', selected.length ? 'animate-pulse bg-primary' : 'bg-outline-variant')} aria-hidden />
            <span className="text-label-md text-on-surface">
              <Trans t={t} i18nKey="selection.count" count={selected.length} components={{ hl: <span className="text-primary" /> }} />
            </span>
          </div>
          <Button leftIcon="send" disabled={selected.length === 0} onClick={createRfq}>
            {t('selection.createRfq')}
          </Button>
        </div>
      </header>

      {/* Search bar */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <form role="search" onSubmit={onSearch} className="relative w-full md:max-w-[66%] md:flex-1">
            <label htmlFor={searchId} className="sr-only">
              {t('search.label')}
            </label>
            <Input
              id={searchId}
              type="search"
              leftIcon="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('search.placeholder')}
              inputClassName="h-10 pr-24"
            />
            <Button type="submit" variant="ghost" size="xs" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-surface-container text-on-surface hover:bg-surface-container-high">
              {t('common:actions.search')}
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" leftIcon="tune" onClick={toggleFilters} aria-expanded={filtersOpen} aria-controls={panelId}>
              {t('search.quickFilter')}
            </Button>
            <Button variant="secondary" leftIcon="file_download" onClick={exportList} disabled={items.length === 0}>
              {t('search.export')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SupplierFilterPanel
          ref={panelRef}
          id={panelId}
          filters={filters}
          facets={search.data?.facets}
          onChange={setFilters}
          onReset={() => setFilters(clearPanelFilters(filters))}
          className={filtersOpen ? 'flex' : 'hidden lg:flex'}
        />

        <section className="flex min-w-0 flex-col gap-4" aria-label={t('results.label')}>
          {/* Toolbar */}
          <Card padding="none" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-body-md text-on-surface-variant" aria-live="polite">
              <Trans t={t} i18nKey="results.summary" values={{ shown: items.length, total }} components={{ b: <strong className="text-on-surface" /> }} />
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor={sortId} className="whitespace-nowrap text-label-sm text-outline">
                  {t('results.sortBy')}
                </label>
                <Select id={sortId} compact value={sort} onChange={(e) => update({ sort: e.target.value as SupplierSort })} className="min-w-[160px]">
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`results.sort.${s}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <span className="h-5 w-px bg-outline-variant" aria-hidden />
              <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low p-0.5" role="group" aria-label={t('results.viewLabel')}>
                {(['grid', 'list'] as DiscoveryView[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    title={t(`results.view.${v}`)}
                    aria-label={t(`results.view.${v}`)}
                    onClick={() => update({ view: v }, { keepPage: true })}
                    className={clsx('flex rounded p-1.5 transition-colors', view === v ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-on-surface')}
                  >
                    <Icon name={v === 'grid' ? 'grid_view' : 'view_list'} size={18} />
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {search.isPending ? (
            <LoadingState rows={3} />
          ) : search.isError ? (
            <Card>
              <ErrorState error={search.error} onRetry={() => void search.refetch()} />
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <EmptyState
                icon="search_off"
                title={t('common:states.noResults')}
                description={t('results.emptyHint')}
                action={
                  <Button variant="secondary" leftIcon="restart_alt" onClick={() => update({ filters: EMPTY_SUPPLIER_FILTERS })}>
                    {t('common:actions.clearAll')}
                  </Button>
                }
              />
            </Card>
          ) : view === 'grid' ? (
            <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2', search.isPlaceholderData && 'opacity-60')}>
              {items.map((s) => (
                <SupplierCard
                  key={s.id}
                  supplier={s}
                  selected={selected.includes(s.id)}
                  onToggleSelect={() => toggleSelect(s)}
                  saved={bookmark.isSaved(s.id)}
                  savePending={bookmark.isPending(s.id)}
                  onToggleSave={() => bookmark.toggle(s.id, s.name)}
                />
              ))}
            </div>
          ) : (
            <div className={clsx(search.isPlaceholderData && 'opacity-60')}>
              <SupplierListTable
                suppliers={items}
                isSelected={(id) => selected.includes(id)}
                onToggleSelect={toggleSelect}
                isSaved={bookmark.isSaved}
                isSavePending={bookmark.isPending}
                onToggleSave={(s) => bookmark.toggle(s.id, s.name)}
              />
            </div>
          )}

          {total > 0 && (
            <Card padding="none" className="px-4 py-3">
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={(p) => update({ page: p }, { keepPage: true })} />
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
