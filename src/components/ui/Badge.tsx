import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuotationStatus, RfqDisplayStatus } from '@/domain/types';
import { Icon } from './Icon';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'navy' | 'danger' | 'primary' | 'accent';

/** Pill badges from DESIGN.md "Status Badges". */
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  info: 'bg-[#EFF6FF] text-[#0078F8] border-[#BFDBFE]',
  warning: 'bg-warning-container text-warning border-warning-border',
  success: 'bg-success-container text-success border-success-border',
  navy: 'bg-[#EEF2FF] text-procura-navy border-[#C7D2FE]',
  danger: 'bg-danger-container text-danger border-danger-border',
  primary: 'bg-primary text-on-primary border-primary',
  accent: 'bg-primary-fixed text-on-primary-fixed-variant border-primary-fixed-dim',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: string;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, dot, className, children }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-label-sm', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

const rfqTones: Record<RfqDisplayStatus, BadgeTone> = {
  draft: 'neutral',
  open: 'info',
  awaiting: 'warning',
  quoted: 'success',
  awarded: 'navy',
  expired: 'neutral',
  cancelled: 'danger',
};

export function RfqStatusBadge({ status, className }: { status: RfqDisplayStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={rfqTones[status]} dot className={className}>
      {t(`rfqStatus.${status}`)}
    </Badge>
  );
}

const quotationTones: Record<QuotationStatus, BadgeTone> = {
  draft: 'neutral',
  submitted: 'info',
  viewed: 'accent',
  awarded: 'success',
  not_selected: 'neutral',
  withdrawn: 'danger',
  expired: 'neutral',
};

export function QuotationStatusBadge({ status, className }: { status: QuotationStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={quotationTones[status]} dot className={className}>
      {t(`quotationStatus.${status}`)}
    </Badge>
  );
}

/** Small grey rectangular chip used for specs and certifications ("ISO 9001", "Sóng E"). */
export function Chip({ children, className, icon }: { children: ReactNode; className?: string; icon?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant', className)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

/** Verified-by-Procura badge with check icon. */
export function VerifiedBadge({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone="success" icon="verified" className={className}>
      {label ?? t('labels.verified')}
    </Badge>
  );
}
