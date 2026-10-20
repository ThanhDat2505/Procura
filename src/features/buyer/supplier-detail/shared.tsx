import clsx from 'clsx';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ProgressBar } from '@/components/ui';
import { useFormat } from '@/hooks/useFormat';
import { certificateTileLabel } from './supplierDetail';

/** `:supplierId` route param of the supplier detail pages. */
export function useSupplierId(): string {
  return useParams<{ supplierId: string }>().supplierId ?? '';
}

export const detailPath = (supplierId: string, tab?: 'products' | 'history' | 'legal' | 'reviews') =>
  `/buyer/suppliers/${supplierId}${tab ? `/${tab}` : ''}`;

export const newRfqWithSupplier = (supplierId: string) => `/buyer/rfqs/new?suppliers=${encodeURIComponent(supplierId)}`;
export const newRfqWithProduct = (productId: string) => `/buyer/rfqs/new?product=${encodeURIComponent(productId)}`;

/** Formatting shared by the catalogue tables: "7.500 – 9.000 đ" and "5 - 7 ngày". */
export function useCatalogFormat() {
  const f = useFormat();
  const { t } = useTranslation('supplierDetail');
  const priceRange = useCallback((min: number, max: number) => (min === max ? f.money(min) : `${f.number(min)} – ${f.money(max)}`), [f]);
  const leadTime = useCallback(
    (min: number, max: number) => (min === max ? t('common:time.days', { count: min }) : t('leadTimeRange', { min, max })),
    [t],
  );
  return { f, priceRange, leadTime };
}

/** Ratings are always shown with one decimal ("4.9"), like `RatingInline`. */
export const formatScore = (value: number) => value.toFixed(1);

/** "Độ tin cậy chất lượng ……… 5.0 / 5" with a bar underneath. */
export function ScoreBar({ label, value, max = 5, suffix, compact, className }: { label: string; value: number; max?: number; suffix?: string; compact?: boolean; className?: string }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div className="flex items-start justify-between gap-3 text-body-sm">
        <span className={compact ? 'text-on-surface-variant' : 'text-on-surface'}>{label}</span>
        <span className={clsx('shrink-0 font-semibold tabular-nums', compact ? 'text-on-surface' : 'text-primary')}>
          {formatScore(value)} / {suffix ?? max}
        </span>
      </div>
      <ProgressBar value={value / max} className={compact ? 'h-1.5' : undefined} label={label} />
    </div>
  );
}

const tileTones = {
  primary: 'bg-primary-fixed text-primary border-primary-fixed-dim',
  success: 'bg-success-container text-success border-success-border',
  warning: 'bg-warning-container text-warning border-warning-border',
  neutral: 'bg-surface-container-lowest text-primary border-outline-variant',
};

/** Square certificate code tile ("ISO", "FSC", "EMS"). */
export function CertTile({ code, tone = 'neutral', size = 'md' }: { code: string; tone?: keyof typeof tileTones; size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-lg border font-bold',
        size === 'sm' ? 'h-9 w-9 text-label-sm' : 'h-10 w-10 text-headline-sm',
        tileTones[tone],
      )}
      aria-hidden
    >
      {certificateTileLabel(code)}
    </span>
  );
}
