import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button, ButtonLink, Card, Chip, EmptyState, ErrorState, Input, LoadingState, Table, Td, Th, THead, Tr } from '@/components/ui';
import { useSupplierProducts } from '@/hooks/buyer';
import { newRfqWithProduct, useCatalogFormat, useSupplierId } from './shared';
import { matchesProduct, productGroups } from './supplierDetail';

const ALL = '__all__';

/** BUY-03b — "Danh mục sản phẩm & MOQ". */
export default function ProductsTab() {
  const { t } = useTranslation('supplierDetail');
  const supplierId = useSupplierId();
  const products = useSupplierProducts(supplierId);
  const { f, priceRange, leadTime } = useCatalogFormat();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(ALL);

  const all = useMemo(() => products.data ?? [], [products.data]);
  const groups = useMemo(() => productGroups(all), [all]);
  const visible = useMemo(() => all.filter((p) => (group === ALL || p.group === group) && matchesProduct(p, query)), [all, group, query]);

  if (products.isPending) return <LoadingState />;
  if (products.isError) return <ErrorState error={products.error} onRetry={() => void products.refetch()} />;

  const chip = (value: string, label: string) => {
    const active = group === value;
    return (
      <button
        key={value}
        type="button"
        aria-pressed={active}
        onClick={() => setGroup(value)}
        className={clsx(
          'shrink-0 whitespace-nowrap rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm transition-colors',
          active ? 'bg-surface-container-high font-bold text-primary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <section className="flex flex-col gap-4" aria-label={t('tabs.products')}>
      <Card padding="none" className="flex flex-col gap-3 p-3.5 md:flex-row md:items-center">
        <Input
          type="search"
          leftIcon="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('products.searchPlaceholder')}
          aria-label={t('products.searchLabel')}
          className="w-full md:w-80 md:shrink-0"
        />
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto" role="group" aria-label={t('products.groupsLabel')}>
          {chip(ALL, t('products.allGroups', { count: all.length }))}
          {groups.map((g) => chip(g.group, `${g.group} (${g.count})`))}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            icon="search_off"
            title={all.length === 0 ? t('products.empty') : t('common:states.noResults')}
            action={
              all.length > 0 && (
                <Button
                  variant="secondary"
                  leftIcon="restart_alt"
                  onClick={() => {
                    setQuery('');
                    setGroup(ALL);
                  }}
                >
                  {t('common:actions.reset')}
                </Button>
              )
            }
          />
        ) : (
          <Table minWidth={920}>
            <THead>
              <tr>
                <Th>{t('products.cols.name')}</Th>
                <Th>{t('products.cols.sku')}</Th>
                <Th className="text-right">{t('products.cols.moq')}</Th>
                <Th className="text-right">{t('products.cols.price')}</Th>
                <Th className="text-center">{t('common:labels.leadTime')}</Th>
                <Th>{t('common:labels.certifications')}</Th>
                <Th className="text-right">{t('common:labels.actions')}</Th>
              </tr>
            </THead>
            <tbody>
              {visible.map((p) => (
                <Tr key={p.id}>
                  <Td className="min-w-[200px]">
                    <div className="text-[13px] font-medium text-on-surface">{p.name}</div>
                    <div className="mt-0.5 text-[11px] text-on-surface-variant">{p.spec}</div>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-code-tabular text-on-surface-variant">{p.sku}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold text-on-surface">
                    {f.number(p.moq)} {p.unit}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <span className="block font-semibold text-on-surface">{priceRange(p.priceMin, p.priceMax)}</span>
                    <span className="block text-[11px] text-on-surface-variant">/ {p.unit}</span>
                  </Td>
                  <Td className="text-center">
                    <span className="inline-flex whitespace-nowrap rounded bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">{leadTime(p.leadTimeMinDays, p.leadTimeMaxDays)}</span>
                  </Td>
                  <Td>
                    <div className="flex min-w-[110px] flex-wrap items-center gap-1">
                      {p.certifications.map((c) => (
                        <Chip key={c} className="bg-surface-container-high text-[10px]">
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <ButtonLink to={newRfqWithProduct(p.id)} variant="outline" size="xs" leftIcon="add" className="border-primary/40">
                      {t('addToRfq')}
                    </ButtonLink>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="flex flex-col gap-1 border-t border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant md:flex-row md:items-center md:justify-between md:gap-4">
          <p>
            <Trans t={t} i18nKey="products.footer" values={{ shown: visible.length, total: all.length }} components={{ b: <span className="font-semibold text-on-surface" /> }} />
          </p>
          <p className="text-[11px] text-outline">{t('products.vatNote')}</p>
        </div>
      </Card>
    </section>
  );
}
