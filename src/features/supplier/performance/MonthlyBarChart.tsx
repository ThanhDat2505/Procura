import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupplierPerformance } from '@/domain/performance';
import { barPercent, niceScale, parseMonth } from './performanceHelpers';

/** Series colours: a recessive slate for "submitted" (context) and the brand blue for "awarded" (the story). */
export const SERIES = {
  submitted: 'bg-[#94A3B8]',
  awarded: 'bg-primary',
} as const;

/**
 * Grouped column chart "Báo giá đã gửi vs Trúng thầu theo tháng" built from plain elements.
 * One y-scale, columns ≤ 20px with 4px rounded caps on a shared baseline, a 2px gap between the
 * pair, value labels on the caps, hover tooltip per month, and a visually-hidden data table.
 */
export function MonthlyBarChart({ monthly }: { monthly: SupplierPerformance['monthly'] }) {
  const { t } = useTranslation('performance');
  const [hover, setHover] = useState<number | null>(null);
  const scale = niceScale(Math.max(0, ...monthly.map((m) => Math.max(m.submitted, m.awarded))));
  const label = (key: string) => t('chart.monthShort', { month: parseMonth(key).month });
  const summary = t('chart.aria', {
    items: monthly.map((m) => t('chart.ariaItem', { month: label(m.month), submitted: m.submitted, awarded: m.awarded })).join('; '),
  });

  return (
    <figure className="m-0">
      <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/40 px-3 pb-2 pt-6">
        <div role="img" aria-label={summary} className="flex gap-2">
          {/* Y axis ticks */}
          <div className="relative h-48 w-5 shrink-0 text-right text-[10px] tabular-nums text-on-surface-variant" aria-hidden>
            {scale.ticks.map((v) => (
              <span key={v} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${barPercent(v, scale.max)}%` }}>
                {v}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-48 border-b border-outline">
              {/* Gridlines (hairline, recessive) */}
              {scale.ticks.slice(1).map((v) => (
                <span key={v} className="absolute inset-x-0 h-px bg-outline-variant/50" style={{ bottom: `${barPercent(v, scale.max)}%` }} aria-hidden />
              ))}
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))` }}>
                {monthly.map((m, i) => (
                  <div
                    key={m.month}
                    className={clsx('relative flex h-full items-end justify-center gap-[2px] rounded-t transition-colors', hover === i && 'bg-primary/[0.04]')}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <Bar value={m.submitted} pct={barPercent(m.submitted, scale.max)} className={SERIES.submitted} />
                    <Bar value={m.awarded} pct={barPercent(m.awarded, scale.max)} className={SERIES.awarded} />
                    {hover === i && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-[11px] text-on-surface shadow-level-3">
                        <p className="font-semibold">{t('chart.monthLong', { month: parseMonth(m.month).month, year: parseMonth(m.month).year })}</p>
                        <p className="flex items-center gap-1.5">
                          <span className={clsx('h-2 w-2 rounded-sm', SERIES.submitted)} />
                          {t('chart.submitted')}: <strong className="tabular-nums">{m.submitted}</strong>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className={clsx('h-2 w-2 rounded-sm', SERIES.awarded)} />
                          {t('chart.awarded')}: <strong className="tabular-nums">{m.awarded}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))` }} aria-hidden>
              {monthly.map((m, i) => (
                <span key={m.month} className={clsx('text-center text-label-sm', hover === i ? 'text-primary' : 'text-on-surface-variant')}>
                  {label(m.month)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{t('chart.title')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('chart.month')}</th>
            <th scope="col">{t('chart.submitted')}</th>
            <th scope="col">{t('chart.awarded')}</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((m) => (
            <tr key={m.month}>
              <th scope="row">{t('chart.monthLong', { month: parseMonth(m.month).month, year: parseMonth(m.month).year })}</th>
              <td>{m.submitted}</td>
              <td>{m.awarded}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Bar({ value, pct, className }: { value: number; pct: number; className: string }) {
  return (
    <div className="relative h-full w-3.5 sm:w-5">
      <div className={clsx('absolute inset-x-0 bottom-0 rounded-t', className)} style={{ height: `${pct}%` }} />
      <span className="absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums leading-none text-on-surface-variant" style={{ bottom: `calc(${pct}% + 3px)` }}>
        {value}
      </span>
    </div>
  );
}
