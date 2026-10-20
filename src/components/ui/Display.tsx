import clsx from 'clsx';
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { clock } from '@/domain/clock';
import { deadlineInfo } from '@/domain/rfq';
import { useFormat } from '@/hooks/useFormat';
import { Button } from './Button';
import { Icon } from './Icon';

// ---------------------------------------------------------------------------
// Avatar (initials)
// ---------------------------------------------------------------------------

const avatarSizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-label-sm', md: 'h-10 w-10 text-label-md', lg: 'h-12 w-12 text-label-lg', xl: 'h-16 w-16 text-headline-sm' };
const avatarTones = {
  primary: 'bg-primary-fixed text-primary',
  solid: 'bg-primary text-on-primary',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  navy: 'bg-procura-navy text-white',
  success: 'bg-success-container text-success',
};

export function Avatar({
  initials,
  size = 'md',
  tone = 'primary',
  square,
  className,
}: {
  initials: string;
  size?: keyof typeof avatarSizes;
  tone?: keyof typeof avatarTones;
  square?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center font-bold', square ? 'rounded-lg' : 'rounded-full', avatarSizes[size], avatarTones[tone], className)} aria-hidden>
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Rating & progress
// ---------------------------------------------------------------------------

export function RatingStars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center text-[#F59E0B]', className)} aria-label={`${value} / 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star_half' : 'star'} filled={value >= i - 0.75} size={size} className={value < i - 0.75 ? 'text-outline-variant' : undefined} />
      ))}
    </span>
  );
}

/** "★ 4.9 (38)" compact rating used on supplier cards. */
export function RatingInline({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 text-label-md text-on-surface', className)}>
      <Icon name="star" filled size={16} className="text-[#F59E0B]" />
      <span className="tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined && <span className="font-normal text-on-surface-variant">({count})</span>}
    </span>
  );
}

export function ProgressBar({ value, tone = 'primary', className, label }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'navy'; className?: string; label?: string }) {
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-[#F59E0B]', danger: 'bg-danger', navy: 'bg-procura-navy' }[tone];
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-surface-container-high', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx('h-full rounded-full transition-[width]', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Money & deadline
// ---------------------------------------------------------------------------

export function Money({ value, unit, className, unitClassName }: { value: number; unit?: string; className?: string; unitClassName?: string }) {
  const f = useFormat();
  return (
    <span className={clsx('tabular-nums', className)}>
      {f.money(value)}
      {unit && <span className={clsx('ml-1 font-normal text-on-surface-variant', unitClassName)}>/ {unit}</span>}
    </span>
  );
}

/** "Còn 2 ngày" pill. Red when ≤3 days, neutral otherwise. */
export function DeadlineBadge({ deadline, className }: { deadline: string; className?: string }) {
  const { t } = useTranslation();
  const info = deadlineInfo(deadline, clock.now());
  const label =
    info.urgency === 'overdue' ? t('deadline.overdue') : info.urgency === 'today' ? t('deadline.today') : t('deadline.daysLeft', { count: info.daysLeft });
  const tone = info.urgency === 'overdue' ? 'bg-surface-container text-on-surface-variant' : info.urgency === 'normal' ? 'bg-surface-container text-on-surface-variant' : 'bg-danger-container text-danger';
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-label-sm', tone, className)}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Scroll container + table with DESIGN.md row architecture (sticky header, 1px row dividers). */
export function Table({ children, className, minWidth = 720 }: { children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-body-md" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-[#F8FAFC] text-label-sm uppercase tracking-wide text-on-surface-variant">{children}</thead>;
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={clsx('whitespace-nowrap border-b border-outline-variant px-4 py-3 font-semibold', className)} {...rest}>
      {children}
    </th>
  );
}

export function Tr({ children, className, onClick, selected }: { children: ReactNode; className?: string; onClick?: () => void; selected?: boolean }) {
  return (
    <tr className={clsx('border-b border-outline-variant/70 transition-colors last:border-b-0 hover:bg-[#F8FAFF]', selected && 'bg-primary/[0.03]', onClick && 'cursor-pointer', className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx('px-4 py-3 align-middle', className)} {...rest}>
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent', className)} role="status" aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-surface-container-high', className)} aria-hidden />;
}

/** Full-area loading placeholder for a page or card. */
export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={clsx('flex flex-col gap-3', className)} aria-busy="true" aria-label={t('states.loading')}>
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: { icon?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description && <p className="max-w-md text-body-md text-on-surface-variant">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useTranslation();
  const code = (error as { code?: string })?.code;
  return (
    <EmptyState
      icon="error"
      className={className}
      title={t('errors.loadFailed')}
      description={code ? t(code, { defaultValue: t('errors.generic') }) : t('errors.generic')}
      action={onRetry && <Button variant="secondary" leftIcon="refresh" onClick={onRetry}>{t('actions.retry')}</Button>}
    />
  );
}

/** Info / warning callout boxes used across forms ("Báo giá kín…", "Lưu ý quan trọng…"). */
export function Callout({ tone = 'info', icon, title, children, className }: { tone?: 'info' | 'warning' | 'success' | 'neutral' | 'danger'; icon?: string; title?: ReactNode; children?: ReactNode; className?: string }) {
  const styles = {
    info: 'bg-primary-fixed/40 border-primary-fixed-dim text-on-surface',
    warning: 'bg-warning-container border-warning-border text-on-surface',
    success: 'bg-success-container border-success-border text-on-surface',
    neutral: 'bg-surface-container-low border-outline-variant text-on-surface-variant',
    danger: 'bg-danger-container border-danger-border text-on-surface',
  }[tone];
  const iconColor = { info: 'text-primary', warning: 'text-warning', success: 'text-success', neutral: 'text-on-surface-variant', danger: 'text-danger' }[tone];
  const defaultIcon = { info: 'info', warning: 'warning', success: 'check_circle', neutral: 'info', danger: 'error' }[tone];
  return (
    <div className={clsx('flex gap-2.5 rounded-lg border p-3 text-body-sm', styles, className)}>
      <Icon name={icon ?? defaultIcon} size={18} className={clsx('mt-px', iconColor)} />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 text-label-md">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/** Label/value pair for read-only detail grids. */
export function KeyValue({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="text-body-md text-on-surface">{value}</dd>
    </div>
  );
}
