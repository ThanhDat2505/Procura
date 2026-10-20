import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  IconButton,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  ProgressBar,
  RatingInline,
  Select,
  Table,
  Td,
  Th,
  THead,
  Tr,
  useToast,
  VerifiedBadge,
} from '@/components/ui';
import { MAX_SUPPLIERS_PER_RFQ } from '@/domain/rfq';
import type { MoqBand } from '@/domain/supplierSearch';
import type { ID, Province } from '@/domain/types';
import { useCreateSavedList, useSavedSuppliers, useToggleSavedSupplier } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { SavedSupplierItem, SavedSuppliersResult } from '@/services';
import { leadTimeLabel } from '../suppliers/components/SupplierCard';
import { downloadCsv, toCsv } from '../suppliers/lib/csv';
import { EMPTY_SAVED_FILTERS, filterSavedItems, savedFilterOptions, savedStats, type SavedFilters } from './savedFilters';

const PAGE_SIZE = 5;
const MOQ_BANDS: MoqBand[] = ['any', 'lt1000', '1000to5000', 'gt5000'];
const LIST_ICONS: Record<string, string> = {
  'list-packaging': 'inventory_2',
  'list-office': 'edit_note',
  'list-furniture': 'chair',
  'list-chemicals': 'science',
};

/** BUY-04 — Nhà cung cấp đã lưu. */
export default function SavedSuppliersPage() {
  const { t } = useTranslation('saved');
  const { data, isPending, isError, error, refetch } = useSavedSuppliers();

  if (isPending) return <LoadingState rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.items.length === 0) {
    return (
      <>
        <SavedHeader count={0} />
        <Card>
          <EmptyState
            icon="bookmark"
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              <ButtonLink to="/buyer/suppliers" leftIcon="travel_explore">
                {t('empty.action')}
              </ButtonLink>
            }
          />
        </Card>
      </>
    );
  }
  return <SavedSuppliersView data={data} />;
}

function SavedHeader({ count, actions }: { count: number; actions?: ReactNode }) {
  const { t } = useTranslation('saved');
  return (
    <PageHeader
      breadcrumbs={[{ label: t('breadcrumb.sourcing'), to: '/buyer/suppliers' }, { label: t('title') }]}
      title={t('title')}
      badge={
        <span className="inline-flex items-center rounded-full border border-primary-fixed-dim bg-primary-fixed px-2.5 py-0.5 text-label-sm text-on-primary-fixed">
          {t('countBadge', { count })}
        </span>
      }
      subtitle={t('subtitle')}
      actions={actions}
    />
  );
}

function SavedSuppliersView({ data }: { data: SavedSuppliersResult }) {
  const { t } = useTranslation('saved');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const unsave = useToggleSavedSupplier();

  const [filters, setFilters] = useState<SavedFilters>(EMPTY_SAVED_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ID[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [toUnsave, setToUnsave] = useState<SavedSupplierItem | null>(null);

  const allItems = data.items;
  const filtered = useMemo(() => filterSavedItems(allItems, filters), [allItems, filters]);
  const options = useMemo(() => savedFilterOptions(allItems), [allItems]);
  const stats = useMemo(() => savedStats(allItems), [allItems]);

  const listIsEmpty = filters.listId !== 'all' && !allItems.some((i) => i.listIds.includes(filters.listId));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection only keeps suppliers that are still saved.
  const selected = selectedIds.filter((id) => allItems.some((i) => i.supplierId === id));
  const selectedNames = selected.map((id) => allItems.find((i) => i.supplierId === id)!.supplier.name);

  const patchFilters = (patch: Partial<SavedFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const toggleRow = (id: ID) => {
    if (selected.includes(id)) return setSelectedIds(selected.filter((x) => x !== id));
    if (selected.length >= MAX_SUPPLIERS_PER_RFQ) return toast(t('common:validation.maxSuppliers'), 'error');
    setSelectedIds([...selected, id]);
  };

  const pageIds = pageItems.map((i) => i.supplierId);
  const pageSelectedCount = pageIds.filter((id) => selected.includes(id)).length;
  const allPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length;
  const togglePage = () => {
    if (allPageSelected) return setSelectedIds(selected.filter((id) => !pageIds.includes(id)));
    const room = MAX_SUPPLIERS_PER_RFQ - selected.length;
    const toAdd = pageIds.filter((id) => !selected.includes(id));
    if (toAdd.length > room) toast(t('common:validation.maxSuppliers'), 'error');
    setSelectedIds([...selected, ...toAdd.slice(0, Math.max(0, room))]);
  };

  const createRfq = () => navigate(`/buyer/rfqs/new?suppliers=${selected.join(',')}`);

  const exportCsv = () => {
    const filename = t('export.filename');
    const csv = toCsv(
      [t('table.supplier'), t('common:labels.category'), t('common:labels.location'), t('common:labels.rating'), t('table.moq'), t('table.leadTime'), t('common:labels.certifications'), t('table.note')],
      filtered.map(({ supplier: s, note }) => [
        s.name,
        s.categories.map((c) => t(`common:categories.${c}`)).join(', '),
        s.locationLabel,
        s.rating.toFixed(1),
        `${f.number(s.moq)} ${s.moqUnit}`,
        leadTimeLabel(t, s),
        s.certifications.join(', '),
        note,
      ]),
    );
    downloadCsv(filename, csv);
    toast(t('common:toast.exported', { name: filename }), 'success');
  };

  const confirmUnsave = () => {
    if (!toUnsave) return;
    const { supplierId, supplier } = toUnsave;
    unsave.mutate(
      { supplierId, save: false },
      {
        onSuccess: () => {
          toast(t('unsave.done', { name: supplier.name }), 'success');
          setSelectedIds((ids) => ids.filter((id) => id !== supplierId));
          setToUnsave(null);
        },
        onError: () => toast(t('common:errors.generic'), 'error'),
      },
    );
  };

  return (
    <>
      <SavedHeader
        count={allItems.length}
        actions={
          <>
            <Button variant="secondary" leftIcon="download" onClick={exportCsv} disabled={filtered.length === 0}>
              {t('common:actions.exportExcel')}
            </Button>
            <Button leftIcon="send" disabled={selected.length === 0} onClick={createRfq}>
              {t('createRfqSelected', { count: selected.length })}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left column */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card padding="sm" as="section" aria-label={t('lists.title')}>
            <h2 className="border-b border-outline-variant/60 pb-3 text-label-sm uppercase tracking-wider text-on-surface">{t('lists.title')}</h2>
            <ul className="mt-3 space-y-1">
              <ListButton icon="folder_special" label={t('lists.all')} count={allItems.length} active={filters.listId === 'all'} onClick={() => patchFilters({ listId: 'all' })} />
              {data.lists.map((l) => (
                <ListButton key={l.id} icon={LIST_ICONS[l.id] ?? 'folder'} label={l.name} count={l.count} active={filters.listId === l.id} onClick={() => patchFilters({ listId: l.id })} />
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline bg-surface-container-lowest px-3 py-2 text-label-sm text-on-surface-variant transition-colors hover:border-primary hover:bg-surface-container-low hover:text-primary"
            >
              <Icon name="add_circle" size={16} />
              {t('lists.create')}
            </button>
          </Card>

          <Card padding="sm" as="section" aria-labelledby="saved-stats-title">
            <h2 id="saved-stats-title" className="mb-2 text-label-md text-on-surface">
              {t('stats.title')}
            </h2>
            <dl className="space-y-3 text-body-sm">
              <div className="flex items-center justify-between">
                <dt className="text-outline">{t('stats.verified')}</dt>
                <dd className="font-bold tabular-nums text-on-surface">
                  {stats.verified} / {stats.total}
                </dd>
              </div>
              <ProgressBar value={stats.total ? stats.verified / stats.total : 0} className="h-1.5" label={t('stats.verified')} />
              <div className="flex items-center justify-between pt-1">
                <dt className="text-outline">{t('stats.avgLeadTime')}</dt>
                <dd className="font-bold tabular-nums text-on-surface">{t('stats.days', { value: f.number(stats.avgLeadTimeDays, 1) })}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-outline">{t('stats.withIso')}</dt>
                <dd className="font-bold tabular-nums text-on-surface">{t('stats.suppliers', { count: stats.withIso })}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-4">
          <FilterBar filters={filters} onChange={patchFilters} provinces={options.provinces} certifications={options.certifications} />

          <Card padding="none" className="overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={listIsEmpty ? 'folder_open' : 'search_off'}
                title={listIsEmpty ? t('lists.emptyList') : t('common:states.noResults')}
                description={listIsEmpty ? t('lists.emptyListHint') : undefined}
                action={
                  <Button variant="secondary" leftIcon="restart_alt" onClick={() => patchFilters(EMPTY_SAVED_FILTERS)}>
                    {t('common:actions.reset')}
                  </Button>
                }
              />
            ) : (
              <>
                <Table minWidth={1180}>
                  <THead>
                    <tr>
                      <Th className="w-10 text-center">
                        <HeaderCheckbox checked={allPageSelected} indeterminate={pageSelectedCount > 0 && !allPageSelected} onChange={togglePage} label={t('table.selectPage')} />
                      </Th>
                      <Th>{t('table.supplier')}</Th>
                      <Th>{t('common:labels.category')}</Th>
                      <Th>{t('common:labels.rating')}</Th>
                      <Th className="text-right">{t('table.moq')}</Th>
                      <Th className="text-center">{t('table.leadTime')}</Th>
                      <Th>{t('table.lastInteraction')}</Th>
                      <Th>{t('table.note')}</Th>
                      <Th className="bg-[#F8FAFC] text-center md:sticky md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">{t('common:labels.actions')}</Th>
                    </tr>
                  </THead>
                  <tbody className="text-body-sm">
                    {pageItems.map((item) => (
                      <SavedRow key={item.supplierId} item={item} selected={selected.includes(item.supplierId)} onToggle={() => toggleRow(item.supplierId)} onUnsave={() => setToUnsave(item)} />
                    ))}
                  </tbody>
                </Table>
                <div className="border-t border-outline-variant px-4 py-3">
                  <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
                </div>
              </>
            )}
          </Card>

          {selected.length > 0 && (
            <div
              role="region"
              aria-label={t('selection.label')}
              className="sticky bottom-4 z-20 flex flex-col items-start justify-between gap-4 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 p-4 shadow-level-3 backdrop-blur sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary" aria-hidden>
                  <Icon name="check" size={18} />
                </span>
                <p className="min-w-0">
                  <span className="text-label-md text-on-surface">{t('selection.count', { count: selected.length })}</span>
                  <span className="ml-1 text-body-sm text-outline">· {selectedNames.join(', ')}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
                  {t('selection.clear')}
                </Button>
                <Button size="sm" leftIcon="add_box" onClick={createRfq}>
                  {t('selection.createRfq')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateListModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={toUnsave !== null}
        onClose={() => setToUnsave(null)}
        onConfirm={confirmUnsave}
        loading={unsave.isPending}
        tone="danger"
        title={t('unsave.title')}
        description={toUnsave ? t('unsave.description', { name: toUnsave.supplier.name }) : undefined}
        confirmLabel={t('unsave.confirm')}
      />
    </>
  );
}

function ListButton({ icon, label, count, active, onClick }: { icon: string; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-label-md transition-colors',
          active ? 'bg-primary/10 text-primary' : 'font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon name={icon} size={18} filled={active} className={active ? undefined : 'text-outline'} />
          <span className="min-w-0">{label}</span>
        </span>
        <span className={clsx('shrink-0 tabular-nums', active ? 'rounded-full bg-primary px-2 py-0.5 text-[11px] text-on-primary' : 'text-label-sm text-outline')}>{count}</span>
      </button>
    </li>
  );
}

function HeaderCheckbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <Checkbox ref={ref} checked={checked} onChange={onChange} aria-label={label} className="justify-center" />;
}

function FilterBar({ filters, onChange, provinces, certifications }: { filters: SavedFilters; onChange: (p: Partial<SavedFilters>) => void; provinces: Province[]; certifications: string[] }) {
  const { t } = useTranslation('saved');
  const searchId = useId();
  return (
    <Card padding="none" className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-[240px] flex-1">
        <label htmlFor={searchId} className="sr-only">
          {t('filters.searchLabel')}
        </label>
        <Input id={searchId} type="search" leftIcon="search" value={filters.query} onChange={(e) => onChange({ query: e.target.value })} placeholder={t('filters.searchPlaceholder')} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select compact aria-label={t('filters.province')} value={filters.province} onChange={(e) => onChange({ province: e.target.value as SavedFilters['province'] })}>
          <option value="all">{t('filters.provinceAll')}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {t(`common:provinces.${p}`)}
            </option>
          ))}
        </Select>
        <Select compact aria-label={t('filters.certification')} value={filters.certification} onChange={(e) => onChange({ certification: e.target.value })}>
          <option value="all">{t('filters.certificationAll')}</option>
          {certifications.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select compact aria-label={t('filters.moq')} value={filters.moqBand} onChange={(e) => onChange({ moqBand: e.target.value as MoqBand })}>
          {MOQ_BANDS.map((b) => (
            <option key={b} value={b}>
              {t(`filters.moqBands.${b}`)}
            </option>
          ))}
        </Select>
        <IconButton icon="restart_alt" label={t('filters.reset')} onClick={() => onChange({ ...EMPTY_SAVED_FILTERS, listId: filters.listId })} className="h-8 w-8 border border-outline-variant" size={18} />
      </div>
    </Card>
  );
}

function SavedRow({ item, selected, onToggle, onUnsave }: { item: SavedSupplierItem; selected: boolean; onToggle: () => void; onUnsave: () => void }) {
  const { t } = useTranslation('saved');
  const f = useFormat();
  const s = item.supplier;
  const profile = `/buyer/suppliers/${s.id}`;
  return (
    <Tr selected={selected} className={clsx(selected && 'bg-primary-fixed/10')}>
      <Td className="text-center">
        <Checkbox checked={selected} onChange={onToggle} aria-label={t('table.selectRow', { name: s.name })} className="justify-center" />
      </Td>
      <Td className="min-w-[300px]">
        <div className="flex items-center gap-3">
          <Avatar initials={s.initials} size="md" square tone="primary" className="border border-primary/20" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link to={profile} className="text-label-lg text-on-surface hover:text-primary">
                {s.name}
              </Link>
              {s.verified && <VerifiedBadge className="text-[10px]" />}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-outline">
              <Icon name="location_on" size={13} />
              <span>{s.locationLabel}</span>
            </div>
          </div>
        </div>
      </Td>
      <Td>
        <Chip className="rounded-full border border-outline-variant/50">{t(`common:categories.${s.categories[0]}`)}</Chip>
      </Td>
      <Td>
        <RatingInline value={s.rating} count={s.reviewCount} />
      </Td>
      <Td className="whitespace-nowrap text-right font-medium tabular-nums text-on-surface">
        {f.number(s.moq)} {s.moqUnit}
      </Td>
      <Td className="text-center">
        <Chip className="font-semibold text-on-surface">{leadTimeLabel(t, s)}</Chip>
      </Td>
      <Td className="whitespace-nowrap">
        {item.lastInteraction ? (
          <>
            <div className="text-[11px] font-medium text-on-surface">{f.relative(item.lastInteraction.at)}</div>
            <div className="text-[11px] text-primary">{item.lastInteraction.label}</div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-medium text-on-surface">{t('table.noInteraction')}</div>
            <div className="text-[11px] text-outline">{t('table.savedOn', { date: f.date(item.savedAt) })}</div>
          </>
        )}
      </Td>
      <Td className="max-w-[220px]">
        {item.note ? (
          <p className="line-clamp-2 text-[11px] italic text-on-surface-variant" title={item.note}>
            “{item.note}”
          </p>
        ) : (
          <span className="text-outline">—</span>
        )}
      </Td>
      <Td className="md:sticky md:bg-surface-container-lowest md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">
        <div className="flex items-center justify-center gap-1.5">
          <ButtonLink to={profile} variant="outline" size="xs">
            {t('common:actions.viewProfile')}
          </ButtonLink>
          <IconButton icon="bookmark" filled size={18} label={t('table.unsave', { name: s.name })} onClick={onUnsave} className="text-primary hover:bg-primary/10 hover:text-primary" />
        </div>
      </Td>
    </Tr>
  );
}

function CreateListModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('saved');
  const toast = useToast();
  const create = useCreateSavedList();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const formId = useId();
  const inputId = useId();

  const close = () => {
    setName('');
    setError(undefined);
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('validation.required');
    create.mutate(trimmed, {
      onSuccess: (list) => {
        toast(t('lists.created', { name: list.name }), 'success');
        close();
      },
      onError: () => setError('errors.generic'),
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={t('lists.modalTitle')}
      description={t('lists.modalDescription')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={create.isPending}>
            {t('lists.submit')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <Field label={t('lists.nameLabel')} htmlFor={inputId} required error={error}>
          <Input
            id={inputId}
            value={name}
            maxLength={60}
            invalid={Boolean(error)}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder={t('lists.namePlaceholder')}
          />
        </Field>
      </form>
    </Modal>
  );
}
