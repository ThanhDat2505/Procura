import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid' | 'link' | 'navy';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors duration-150 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-procura-accent disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]';

const variants: Record<ButtonVariant, string> = {
  // DESIGN.md: primary CTA #0078F8, hover #0062CA.
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover',
  secondary: 'bg-surface-container-lowest text-procura-navy border border-outline-variant hover:bg-surface-container-low',
  outline: 'bg-surface-container-lowest text-primary border border-primary hover:bg-primary/5',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
  danger: 'bg-surface-container-lowest text-danger border border-danger-border hover:bg-danger-container',
  'danger-solid': 'bg-danger text-white hover:bg-red-700',
  link: 'text-primary hover:underline px-0 h-auto',
  navy: 'bg-procura-navy text-white hover:bg-procura-navy/90',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-label-md',
  sm: 'h-8 px-3 text-label-md',
  md: 'h-9 px-4 text-label-lg',
  lg: 'h-11 px-5 text-label-lg',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: string;
  rightIcon?: string;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className }: Pick<CommonProps, 'variant' | 'size' | 'fullWidth' | 'className'>) {
  return clsx(base, variants[variant], variant !== 'link' && sizes[size], variant === 'link' && 'text-label-md', fullWidth && 'w-full', className);
}

function Content({ leftIcon, rightIcon, loading, children, size }: CommonProps) {
  const iconSize = size === 'lg' ? 20 : size === 'xs' ? 16 : 18;
  return (
    <>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        leftIcon && <Icon name={leftIcon} size={iconSize} />
      )}
      {children}
      {rightIcon && <Icon name={rightIcon} size={iconSize} />}
    </>
  );
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {}

export function Button({ variant, size, leftIcon, rightIcon, loading, fullWidth, className, children, type = 'button', disabled, ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      <Content leftIcon={leftIcon} rightIcon={rightIcon} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  );
}

export interface ButtonLinkProps extends CommonProps, Omit<LinkProps, 'children' | 'className'> {}

/** A router link styled as a button. */
export function ButtonLink({ variant, size, leftIcon, rightIcon, fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Content leftIcon={leftIcon} rightIcon={rightIcon} size={size}>
        {children}
      </Content>
    </Link>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string;
  label: string;
  filled?: boolean;
  size?: number;
}

/** Square icon-only button (bookmark, close, kebab…). `label` is required for screen readers. */
export function IconButton({ icon, label, filled, size = 20, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-procura-accent disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} filled={filled} size={size} />
    </button>
  );
}
