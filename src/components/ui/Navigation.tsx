import clsx from 'clsx';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { Icon } from './Icon';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  count?: number;
  icon?: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span className={clsx('rounded-full px-1.5 py-0.5 text-label-sm tabular-nums', active ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant')}>
      {value}
    </span>
  );
}

/** Underline tabs controlled by state (status filters). */
export function Tabs<T extends string>({ items, value, onChange, className, ariaLabel }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('no-scrollbar flex gap-1 overflow-x-auto border-b border-outline-variant', className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={clsx(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-label-lg transition-colors',
              active ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {it.icon && <Icon name={it.icon} size={18} />}
            {it.label}
            {it.count !== undefined && <Count value={it.count} active={active} />}
          </button>
        );
      })}
    </div>
  );
}

/** Underline tabs where each tab is a route (supplier detail / profile sub-pages). */
export function TabLinks({ items, className }: { items: (Omit<TabItem, 'value'> & { to: string; end?: boolean })[]; className?: string }) {
  return (
    <nav className={clsx('no-scrollbar flex gap-1 overflow-x-auto border-b border-outline-variant', className)}>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            clsx(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-label-lg transition-colors',
              isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )
          }
        >
          {({ isActive }) => (
            <>
              {it.icon && <Icon name={it.icon} size={18} />}
              {it.label}
              {it.count !== undefined && <Count value={it.count} active={isActive} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Pill-style tabs (SUP-03 "Tất cả 21 | Chờ kết quả 4 …"). */
export function PillTabs<T extends string>({ items, value, onChange, className, ariaLabel }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-container p-1', className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={clsx(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-label-md transition-colors',
              active ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {it.label}
            {it.count !== undefined && <span className="tabular-nums opacity-80">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumbs & page header
// ---------------------------------------------------------------------------

export interface Crumb {
  label: ReactNode;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={clsx('flex flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant', className)}>
      {items.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <Icon name="chevron_right" size={16} className="text-outline" />}
          {c.to ? (
            <Link to={c.to} className="hover:text-primary hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className={clsx(i === items.length - 1 && 'font-semibold text-on-surface')} aria-current={i === items.length - 1 ? 'page' : undefined}>
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, breadcrumbs, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={clsx('mb-6 flex flex-col gap-3', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-headline-lg text-on-surface">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
  /** Hide the "Hiển thị x–y trên z" text. */
  compact?: boolean;
}

function pageWindow(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onChange, className, compact }: PaginationProps) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-label-md tabular-nums transition-colors disabled:opacity-40';
  return (
    <div className={clsx('flex flex-wrap items-center justify-between gap-3', className)}>
      {!compact && <span className="text-body-sm text-on-surface-variant">{t('labels.showing', { from, to, total })}</span>}
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={clsx(btn, 'border-outline-variant bg-surface-container-lowest')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <Icon name="chevron_left" size={18} />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-on-surface-variant">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
              className={clsx(btn, p === page ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={clsx(btn, 'border-outline-variant bg-surface-container-lowest')} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  );
}
