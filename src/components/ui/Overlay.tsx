import clsx from 'clsx';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

/** Moves focus into the dialog on open and restores it on close. */
function useFocusTrap(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = node?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close]), [href]');
    (focusable ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return ref;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Centered modal (Level 4 elevation). */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
  const titleId = useId();
  const ref = useFocusTrap(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-procura-navy/30 p-0 backdrop-blur-[1px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx('flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-surface-container-lowest shadow-level-4 outline-none sm:rounded-xl', { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size])}
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div>
            <h2 id={titleId} className="text-headline-sm text-on-surface">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} data-close />
        </div>
        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-side drawer (SUP-05c "Thêm sản phẩm mới"). */
export function Drawer({ open, onClose, title, description, children, footer, width = 440 }: DialogProps & { width?: number }) {
  const titleId = useId();
  const ref = useFocusTrap(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-procura-navy/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-full w-full flex-col bg-surface-container-lowest shadow-level-4 outline-none" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-6 py-4">
          <div>
            <h2 id={titleId} className="text-headline-md text-on-surface">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} data-close />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-outline-variant px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, tone = 'primary', loading, children }: ConfirmProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger-solid' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Popover / dropdown menu
// ---------------------------------------------------------------------------

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** Click-to-open popover (Level 3 elevation) closing on outside click / Escape. */
export function Popover({ trigger, children, align = 'right', className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useEscape(open, close);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div id={id} className={clsx('absolute top-full z-40 mt-2 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-3', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, tone, className }: { icon?: string; children: ReactNode; onClick: () => void; tone?: 'danger'; className?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx('flex w-full items-center gap-2.5 px-3 py-2 text-left text-body-md hover:bg-surface-container-low', tone === 'danger' ? 'text-danger' : 'text-on-surface', className)}
    >
      {icon && <Icon name={icon} size={18} className={tone === 'danger' ? 'text-danger' : 'text-on-surface-variant'} />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}

const ToastContext = createContext<((message: ReactNode, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: ReactNode, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-6 sm:translate-x-0" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md shadow-level-3">
              <Icon
                name={t.tone === 'success' ? 'check_circle' : t.tone === 'error' ? 'error' : 'info'}
                filled
                className={t.tone === 'success' ? 'text-success' : t.tone === 'error' ? 'text-danger' : 'text-primary'}
              />
              <span className="flex-1 text-on-surface">{t.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
