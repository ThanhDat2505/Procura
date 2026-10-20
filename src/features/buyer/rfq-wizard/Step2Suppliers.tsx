import clsx from 'clsx';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  Callout,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Input,
  LoadingState,
  Pagination,
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
import { PROVINCES } from '@/domain/catalog';
import { MAX_SUPPLIERS_PER_RFQ } from '@/domain/rfq';
import { EMPTY_SUPPLIER_FILTERS, filterSuppliers, type SupplierFilters } from '@/domain/supplierSearch';
import type { CategoryId, Province, SupplierSummary } from '@/domain/types';
import { useSavedSuppliers, useSupplierSearch, useUpdateRfqDraft } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import { paginateLocal } from '../rfqs/listHelpers';
import { invitedSuppliers, MoqFitChip, SummaryRow, useErrorText, useRegisterSaver, WizardFooter, WizardLayout, type StepProps } from './parts';

type SourceTab = 'suggested' | 'saved' | 'all';
const PAGE_SIZE = 8;
const ISO = 'ISO 9001';

interface ChipFilters {
  categories: CategoryId[];
  provinces: Province[];
  certifications: string[];
}

export default function Step2Suppliers({ detail, goTo, registerSaver }: StepProps) {
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const { rfq } = detail;
  const update = useUpdateRfqDraft(rfq.id);

  const [selected, setSelected] = useState<SupplierSummary[]>(() => invitedSuppliers(detail));
  const [tab, setTab] = useState<SourceTab>('suggested');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [chips, setChips] = useState<ChipFilters>({ categories: [rfq.categoryId], provinces: [], certifications: [] });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<'draft' | 'next' | null>(null);
  const [showError, setShowError] = useState(false);

  const filters: SupplierFilters = { ...EMPTY_SUPPLIER_FILTERS, ...chips, query: deferredQuery };
  const suggested = useSupplierSearch({ filters, sort: 'relevance', page: tab === 'suggested' ? page : 1, pageSize: PAGE_SIZE });
  const everyone = useSupplierSearch({ filters: { ...EMPTY_SUPPLIER_FILTERS, query: deferredQuery }, sort: 'rating', page: tab === 'all' ? page : 1, pageSize: PAGE_SIZE });
  const saved = useSavedSuppliers();
  const savedFiltered = useMemo(() => filterSuppliers(saved.data?.items.map((i) => i.supplier) ?? [], filters), [saved.data, filters]);

  const active = tab === 'saved' ? saved : tab === 'all' ? everyone : suggested;
  const rows = tab === 'saved' ? paginateLocal(savedFiltered, page, PAGE_SIZE) : tab === 'all' ? (everyone.data?.items ?? []) : (suggested.data?.items ?? []);
  const total = tab === 'saved' ? savedFiltered.length : tab === 'all' ? (everyone.data?.total ?? 0) : (suggested.data?.total ?? 0);

  const selectedIds = new Set(selected.map((s) => s.id));
  const supplierIds = () => selected.map((s) => s.id);

  const saveSilently = () => update.mutateAsync({ supplierIds: supplierIds() });
  useRegisterSaver(registerSaver, saveSilently);

  const toggle = (s: SupplierSummary) => {
    setShowError(false);
    if (selectedIds.has(s.id)) {
      setSelected((prev) => prev.filter((x) => x.id !== s.id));
    } else if (selected.length >= MAX_SUPPLIERS_PER_RFQ) {
      toast(t('common:validation.maxSuppliers'), 'error');
    } else {
      setSelected((prev) => [...prev, s]);
    }
  };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(rows.map((r) => r.id));
      setSelected((prev) => prev.filter((x) => !visible.has(x.id)));
      return;
    }
    const additions = rows.filter((r) => !selectedIds.has(r.id));
    const room = MAX_SUPPLIERS_PER_RFQ - selected.length;
    if (additions.length > room) toast(t('common:validation.maxSuppliers'), 'error');
    setSelected((prev) => [...prev, ...additions.slice(0, Math.max(0, room))]);
    setShowError(false);
  };

  const saveDraft = async () => {
    setBusy('draft');
    try {
      await saveSilently();
      toast(t('common:toast.draftSaved'));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const next = async () => {
    if (selected.length < 1) {
      setShowError(true);
      toast(t('common:validation.minSuppliers'), 'error');
      return;
    }
    setBusy('next');
    try {
      await update.mutateAsync({ supplierIds: supplierIds(), completedStep: Math.max(rfq.completedStep, 2) });
      registerSaver(null);
      goTo(3);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const changeTab = (v: SourceTab) => {
    setTab(v);
    setPage(1);
  };
  const updateChips = (patch: Partial<ChipFilters>) => {
    setChips((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };
  const hasChips = chips.categories.length + chips.provinces.length + chips.certifications.length > 0;

  const tabs: TabItem<SourceTab>[] = [
    { value: 'suggested', label: t('step2.tabs.suggested'), count: suggested.data?.total },
    { value: 'saved', label: t('step2.tabs.saved'), count: saved.data ? savedFiltered.length : undefined },
    { value: 'all', label: t('step2.tabs.all') },
  ];

  const main = (
    <Card padding="md" className="sm:p-6">
      <h2 className="text-headline-md text-on-surface">{t('step2.title')}</h2>
      <p className="mt-1 text-body-md text-on-surface-variant">{t('step2.subtitle', { max: MAX_SUPPLIERS_PER_RFQ })}</p>

      <Tabs items={tabs} value={tab} onChange={changeTab} className="mt-4" ariaLabel={t('step2.tabsLabel')} />

      <div className="mt-4 flex flex-col gap-3">
        <Input
          leftIcon="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t('step2.searchPlaceholder')}
          aria-label={t('step2.searchPlaceholder')}
        />
        {tab !== 'all' && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.categories.map((c) => (
              <FilterChip key={c} label={t('step2.chips.category', { value: t(`common:categories.${c}`) })} onRemove={() => updateChips({ categories: chips.categories.filter((x) => x !== c) })} removeLabel={t('step2.chips.remove')} />
            ))}
            {chips.provinces.map((p) => (
              <FilterChip key={p} label={t('step2.chips.province', { value: t(`common:provinces.${p}`) })} onRemove={() => updateChips({ provinces: chips.provinces.filter((x) => x !== p) })} removeLabel={t('step2.chips.remove')} />
            ))}
            {chips.certifications.map((c) => (
              <FilterChip key={c} label={t('step2.chips.cert', { value: c })} onRemove={() => updateChips({ certifications: chips.certifications.filter((x) => x !== c) })} removeLabel={t('step2.chips.remove')} />
            ))}
            {!chips.categories.includes(rfq.categoryId) && (
              <Button variant="ghost" size="xs" leftIcon="add" onClick={() => updateChips({ categories: [...chips.categories, rfq.categoryId] })}>
                {t('step2.chips.addCategory', { value: t(`common:categories.${rfq.categoryId}`) })}
              </Button>
            )}
            {!chips.certifications.includes(ISO) && (
              <Button variant="ghost" size="xs" leftIcon="add" onClick={() => updateChips({ certifications: [...chips.certifications, ISO] })}>
                {ISO}
              </Button>
            )}
            <Select
              compact
              value=""
              aria-label={t('step2.chips.addProvince')}
              onChange={(e) => e.target.value && updateChips({ provinces: [...chips.provinces, e.target.value as Province] })}
              className="w-auto"
            >
              <option value="">{t('step2.chips.addProvince')}</option>
              {PROVINCES.filter((p) => !chips.provinces.includes(p)).map((p) => (
                <option key={p} value={p}>
                  {t(`common:provinces.${p}`)}
                </option>
              ))}
            </Select>
            {(hasChips || query) && (
              <Button
                variant="link"
                onClick={() => {
                  updateChips({ categories: [], provinces: [], certifications: [] });
                  setQuery('');
                }}
              >
                {t('step2.chips.clear')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-outline-variant">
        {active.isError ? (
          <ErrorState error={active.error} onRetry={() => void active.refetch()} />
        ) : !active.data ? (
          <LoadingState rows={4} className="p-4" />
        ) : rows.length === 0 ? (
          <EmptyState icon="factory" title={t('common:states.noResults')} description={tab === 'saved' ? t('step2.emptySaved') : t('step2.emptyHint')} />
        ) : (
          <Table minWidth={560}>
            <THead>
              <tr>
                <Th className="w-10 !px-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label={t('step2.selectAll')} className="h-4 w-4 rounded border-outline text-primary focus:ring-primary" />
                </Th>
                <Th className="!whitespace-normal !px-3">{t('step2.table.supplier')}</Th>
                <Th className="!whitespace-normal !px-3">{t('step2.table.certLocation')}</Th>
                <Th className="!whitespace-normal !px-3">{t('step2.table.moq')}</Th>
                <Th className="!whitespace-normal !px-3">{t('step2.table.leadTime')}</Th>
                <Th className="!whitespace-normal !px-3 text-right">{t('step2.table.fit')}</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map((s) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <Tr key={s.id} selected={isSelected} onClick={() => toggle(s)}>
                    <Td className="!px-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggle(s)} aria-label={t('step2.selectOne', { name: s.name })} className="mt-0.5 h-4 w-4 rounded border-outline text-primary focus:ring-primary" />
                    </Td>
                    <Td className="!px-3 align-top">
                      <Link to={`/buyer/suppliers/${s.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-label-lg text-on-surface hover:text-primary hover:underline">
                        {s.name}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-body-sm text-on-surface-variant">
                        <Icon name="star" filled size={15} className="text-[#F59E0B]" />
                        <span className="font-semibold text-[#B45309]">{s.rating.toFixed(1)}</span>
                        <span aria-hidden>•</span>
                        <span>{t('step2.completedRfqs', { count: s.completedRfqCount })}</span>
                      </p>
                      {s.verified && (
                        <p className="mt-1 flex items-center gap-1 text-body-sm text-tertiary">
                          <Icon name="verified" size={15} />
                          {t('common:labels.verifiedByProcura')}
                        </p>
                      )}
                    </Td>
                    <Td className="!px-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {s.certifications.slice(0, 3).map((c) => (
                          <Chip key={c}>{c}</Chip>
                        ))}
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">{s.locationLabel}</p>
                    </Td>
                    <Td className="!px-3 align-top">
                      <p className="whitespace-nowrap font-semibold text-on-surface">
                        {f.number(s.moq)} {s.moqUnit}
                      </p>
                      <div className="mt-1">{rfq.quantity > 0 && <MoqFitChip moq={s.moq} quantity={rfq.quantity} wrap />}</div>
                    </Td>
                    <Td className="!px-3 align-top">
                      {s.leadTimeMinDays === s.leadTimeMaxDays ? t('common:time.days', { count: s.leadTimeMinDays }) : t('step2.leadRange', { min: s.leadTimeMinDays, max: s.leadTimeMaxDays })}
                    </Td>
                    <Td className="!px-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      {isSelected ? (
                        <button type="button" onClick={() => toggle(s)} className="inline-flex" aria-label={t('step2.unselectOne', { name: s.name })}>
                          <Badge tone="success" icon="check_circle">
                            {t('common:actions.selected')}
                          </Badge>
                        </button>
                      ) : (
                        <Button variant="outline" size="xs" leftIcon="add" onClick={() => toggle(s)}>
                          {t('common:actions.select')}
                        </Button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} className="border-t border-outline-variant p-3" />}
      </div>
    </Card>
  );

  const aside = (
    <>
      <Card padding="md">
        <div className="mb-3 flex items-start justify-between gap-2 border-b border-outline-variant pb-3">
          <h2 className="text-headline-sm text-on-surface">{t('suppliersCard.title')}</h2>
          <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed-variant">{t('step2.maxBadge', { count: selected.length, max: MAX_SUPPLIERS_PER_RFQ })}</span>
        </div>
        <Callout tone="info" icon="visibility_off" title={t('step2.sealedTitle')}>
          {t('common:labels.sealedBidNote')}
        </Callout>
        <p className="mb-2 mt-4 text-label-sm uppercase tracking-wide text-on-surface-variant">{t('step2.selectedList', { count: selected.length })}</p>
        {showError && selected.length === 0 && (
          <p className="mb-2 flex items-center gap-1 text-body-sm text-danger" role="alert">
            <Icon name="error" size={14} />
            {t('common:validation.minSuppliers')}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {selected.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low/60 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-label-md text-on-surface">{s.name}</p>
                <p className="text-body-sm text-on-surface-variant">{t('step2.selectedMeta', { rating: s.rating.toFixed(1), moq: f.number(s.moq) })}</p>
              </div>
              <IconButton icon="delete" size={18} label={t('suppliersCard.remove', { name: s.name })} onClick={() => toggle(s)} className="hover:!text-danger" />
            </li>
          ))}
          {selected.length === 0 && <li className="rounded-lg bg-surface-container-low p-3 text-center text-body-sm text-on-surface-variant">{t('suppliersCard.none')}</li>}
        </ul>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 text-label-lg text-on-surface">{t('step2.summaryTitle')}</h2>
        <div className="flex flex-col gap-2.5">
          <SummaryRow label={t('step2.summary.quantity')}>{rfq.quantity > 0 ? `${f.number(rfq.quantity)} ${rfq.unit}` : '—'}</SummaryRow>
          {(rfq.budgetMin !== undefined || rfq.budgetMax !== undefined) && (
            <SummaryRow label={t('step2.summary.budget')}>
              <span className="text-primary">{[rfq.budgetMin, rfq.budgetMax].filter((v): v is number => v !== undefined).map((v) => f.money(v)).join(' – ')}</span>
            </SummaryRow>
          )}
          <SummaryRow label={t('step2.summary.product')}>{rfq.productName || rfq.subcategory || '—'}</SummaryRow>
          <SummaryRow label={t('step2.summary.neededBy')}>{f.date(rfq.neededBy)}</SummaryRow>
        </div>
      </Card>
    </>
  );

  return (
    <>
      <WizardLayout main={main} aside={aside} />
      <WizardFooter
        code={rfq.code}
        onSaveDraft={() => void saveDraft()}
        saving={busy === 'draft'}
        backLabel={t('common:actions.back')}
        onBack={() => goTo(1)}
        nextLabel={t('footer.continueTo', { step: 3, name: t('steps.3') })}
        onNext={() => void next()}
        nextLoading={busy === 'next'}
      />
    </>
  );
}

function FilterChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low py-1 pl-3 pr-1 text-label-md text-on-surface')}>
      {label}
      <button type="button" onClick={onRemove} aria-label={`${removeLabel}: ${label}`} className="flex h-5 w-5 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}
