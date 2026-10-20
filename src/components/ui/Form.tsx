import clsx from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

/**
 * Form controls following DESIGN.md "Input Fields & Selects": 36px height, 1px #CBD5E1 border,
 * focus border #0078F8 with a 3px 15% ring.
 */
const control =
  'block w-full rounded-lg border border-[#CBD5E1] bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline transition-shadow focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15';

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  /** i18n key (common namespace) or plain message. */
  error?: string;
  htmlFor?: string;
  className?: string;
  labelAside?: ReactNode;
  children: ReactNode;
}

export function Field({ label, required, hint, error, htmlFor, className, labelAside, children }: FieldProps) {
  const { t } = useTranslation();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-label-md text-on-surface">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
          {labelAside}
        </div>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-body-sm text-danger" role="alert">
          <Icon name="error" size={14} />
          {t(error, { defaultValue: error })}
        </p>
      ) : (
        hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  leftIcon?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, prefix, suffix, invalid, className, inputClassName, ...rest },
  ref,
) {
  const hasLeft = Boolean(leftIcon || prefix);
  return (
    <div className={clsx('relative', className)}>
      {leftIcon && <Icon name={leftIcon} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />}
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-md text-[#64748B]">{prefix}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(control, 'h-9 py-2', hasLeft ? 'pl-9' : 'pl-3', suffix ? 'pr-16' : 'pr-3', inputClassName)}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-sm text-on-surface-variant">{suffix}</span>}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  size?: never;
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, compact, children, ...rest }, ref) {
  return (
    <div className={clsx('relative', className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(control, 'cursor-pointer appearance-none bg-none pl-3 pr-9', compact ? 'h-8 py-1 text-label-md' : 'h-9 py-2')}
        {...rest}
      >
        {children}
      </select>
      <Icon name="expand_more" size={18} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={clsx(control, 'px-3 py-2', className)} {...rest} />;
});

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckProps>(function Checkbox({ label, description, aside, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={clsx('flex cursor-pointer items-start gap-2.5', rest.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input ref={ref} id={inputId} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline text-primary focus:ring-primary" {...rest} />
      {(label || description) && (
        <span className="flex min-w-0 flex-1 flex-col">
          {label && <span className="text-body-md text-on-surface">{label}</span>}
          {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
        </span>
      )}
      {aside && <span className="ml-auto text-body-sm tabular-nums text-on-surface-variant">{aside}</span>}
    </label>
  );
});

export const Radio = forwardRef<HTMLInputElement, CheckProps>(function Radio({ label, description, aside, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={clsx('flex cursor-pointer items-start gap-2.5', className)}>
      <input ref={ref} id={inputId} type="radio" className="mt-0.5 h-4 w-4 shrink-0 border-outline text-primary focus:ring-primary" {...rest} />
      {(label || description) && (
        <span className="flex min-w-0 flex-1 flex-col">
          {label && <span className="text-body-md text-on-surface">{label}</span>}
          {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
        </span>
      )}
      {aside && <span className="ml-auto text-body-sm tabular-nums text-on-surface-variant">{aside}</span>}
    </label>
  );
});

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Toggle switch (role="switch"). */
export function Switch({ checked, onChange, label, description, disabled, className, id }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const toggle = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-procura-accent disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-outline-variant',
      )}
    >
      <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
  if (!label && !description) return <span className={className}>{toggle}</span>;
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <label htmlFor={switchId} className="flex min-w-0 cursor-pointer flex-col">
        {label && <span className="text-label-lg text-on-surface">{label}</span>}
        {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
      </label>
      {toggle}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; icon?: string }[];
  className?: string;
  ariaLabel?: string;
}

/** Segmented control (e.g. "Người mua | Nhà cung cấp" on AUTH-01, view modes on BUY-08). */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={clsx('inline-flex rounded-lg bg-surface-container p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-label-md transition-colors',
            value === o.value ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
