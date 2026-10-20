import clsx from 'clsx';
import { forwardRef, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Icon, Radio } from '@/components/ui';
import { CATEGORY_IDS, PROVINCES } from '@/domain/catalog';
import type { MoqBand, SupplierFilters } from '@/domain/supplierSearch';
import type { FacetCount } from '@/services';
import { activeFilterCount, DISCOVERY_CERTIFICATIONS, toggleValue } from '../lib/discoveryParams';

interface Props {
  id: string;
  filters: SupplierFilters;
  facets?: { categories: FacetCount[]; provinces: FacetCount[] };
  onChange: (filters: SupplierFilters) => void;
  onReset: () => void;
  className?: string;
}

const MOQ_BANDS: MoqBand[] = ['any', 'lt1000', '1000to5000', 'gt5000'];

function Group({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-2.5 border-t border-outline-variant pt-4 first:border-t-0 first:pt-0">
      <h3 id={headingId} className="text-label-sm uppercase tracking-wider text-outline">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const countOf = (facets: FacetCount[] | undefined, key: string) => facets?.find((f) => f.key === key)?.count ?? 0;

/** BUY-02 "Bộ lọc nâng cao" card. */
export const SupplierFilterPanel = forwardRef<HTMLElement, Props>(function SupplierFilterPanel({ id, filters, facets, onChange, onReset, className }, ref) {
  const { t } = useTranslation('discovery');
  const moqName = useId();
  const active = activeFilterCount(filters);
  const set = (patch: Partial<SupplierFilters>) => onChange({ ...filters, ...patch });

  return (
    <aside ref={ref} id={id} tabIndex={-1} aria-label={t('filters.title')} className={clsx('card flex-col gap-4 p-4 outline-none', className)}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <h2 className="flex items-center gap-2 text-headline-sm text-on-surface">
          <Icon name="filter_list" className="text-primary" />
          {t('filters.title')}
        </h2>
        <button type="button" className="text-label-sm text-primary hover:underline" onClick={onReset}>
          {t('common:actions.reset')}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <Group title={t('filters.category')}>
          {CATEGORY_IDS.map((c) => (
            <Checkbox
              key={c}
              checked={filters.categories.includes(c)}
              onChange={() => set({ categories: toggleValue(filters.categories, c) })}
              label={t(`common:categories.${c}`)}
              aside={facets ? `(${countOf(facets.categories, c)})` : undefined}
              className="hover:text-primary"
            />
          ))}
        </Group>

        <Group title={t('filters.province')}>
          {PROVINCES.map((p) => (
            <Checkbox
              key={p}
              checked={filters.provinces.includes(p)}
              onChange={() => set({ provinces: toggleValue(filters.provinces, p) })}
              label={t(`common:provinces.${p}`)}
              aside={facets ? countOf(facets.provinces, p) : undefined}
            />
          ))}
        </Group>

        <Group title={t('filters.moq')}>
          {MOQ_BANDS.map((band) => (
            <Radio
              key={band}
              name={moqName}
              checked={filters.moqBand === band}
              onChange={() => set({ moqBand: band })}
              label={<span className={clsx(filters.moqBand === band && band !== 'any' && 'font-medium text-primary')}>{t(`filters.moqBands.${band}`)}</span>}
            />
          ))}
        </Group>

        <Group title={t('filters.certifications')}>
          {DISCOVERY_CERTIFICATIONS.map((c) => (
            <Checkbox
              key={c}
              checked={filters.certifications.includes(c)}
              onChange={() => set({ certifications: toggleValue(filters.certifications, c) })}
              label={t(`filters.certOptions.${c === 'ISO 9001' ? 'iso9001' : 'fsc'}`)}
            />
          ))}
          <Checkbox checked={filters.exportStandardOnly} onChange={() => set({ exportStandardOnly: !filters.exportStandardOnly })} label={t('filters.exportStandard')} />
          <Checkbox checked={filters.ownFactoryOnly} onChange={() => set({ ownFactoryOnly: !filters.ownFactoryOnly })} label={t('filters.ownFactory')} />
        </Group>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-label-sm text-on-surface-variant" aria-live="polite">
        <span>
          {t('filters.applied')} <strong className="text-on-surface">{t('filters.appliedCount', { count: active })}</strong>
        </span>
        {active > 0 && (
          <button type="button" className="font-semibold text-primary hover:underline" onClick={onReset}>
            {t('common:actions.clearAll')}
          </button>
        )}
      </div>
    </aside>
  );
});
