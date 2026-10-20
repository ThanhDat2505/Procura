import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

/** Level-1 white card: 1px outline-variant border, rounded-xl, subtle shadow (DESIGN.md). */
export function Card({ as: Tag = 'section', padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <Tag className={clsx('card', paddings[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  actions?: ReactNode;
  /** Draw the divider under the header (most Stitch cards have one). */
  divider?: boolean;
  className?: string;
  titleAs?: 'h2' | 'h3';
}

export function CardHeader({ title, subtitle, icon, actions, divider = true, className, titleAs: Title = 'h2' }: CardHeaderProps) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3', divider && 'mb-4 border-b border-outline-variant/60 pb-4', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <Icon name={icon} className="mt-0.5 text-primary" />}
        <div className="min-w-0">
          <Title className="text-headline-sm text-on-surface">{title}</Title>
          {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: string;
  iconTone?: 'primary' | 'warning' | 'success' | 'danger' | 'neutral';
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
  valueClassName?: string;
}

const iconTones = {
  primary: 'bg-primary-fixed text-primary',
  warning: 'bg-warning-container text-warning',
  success: 'bg-success-container text-success',
  danger: 'bg-danger-container text-danger',
  neutral: 'bg-surface-container text-on-surface-variant',
};

/** KPI tile used on dashboards and list headers. */
export function StatCard({ label, value, unit, icon, iconTone = 'primary', badge, footer, className, valueClassName }: StatCardProps) {
  return (
    <Card padding="md" className={clsx('flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        {icon && (
          <span className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', iconTones[iconTone])}>
            <Icon name={icon} size={20} />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={clsx('text-display-sm tabular-nums text-on-surface', valueClassName)}>{value}</span>
        {unit && <span className="text-body-md text-on-surface-variant">{unit}</span>}
        {badge}
      </div>
      {footer && <div className="text-body-sm text-on-surface-variant">{footer}</div>}
    </Card>
  );
}
