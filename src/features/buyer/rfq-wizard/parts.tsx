import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Icon } from '@/components/ui';
import { moqFit } from '@/domain/supplierSearch';
import type { SupplierSummary } from '@/domain/types';
import { useFormat } from '@/hooks/useFormat';
import type { RfqDetail } from '@/services';
import type { WizardStep } from './wizardHelpers';

/** Props every wizard step receives from `RfqWizardPage`. */
export interface StepProps {
  detail: RfqDetail;
  /** Saves the current step (no validation) through the registered saver, then opens `target`. */
  goTo: (target: WizardStep | 'list') => void;
  /** The active step registers how to save its unsaved values (used by the stepper and links). */
  registerSaver: (fn: (() => Promise<unknown>) | null) => void;
  /** Step 4 flags a publish in flight so the page sends the buyer to BUY-06e (not the detail page) once the RFQ is open. */
  setPublishing: (on: boolean) => void;
}

/** Registers `save` as the active step's saver on every render (keeps the latest closure). */
export function useRegisterSaver(registerSaver: StepProps['registerSaver'], save: () => Promise<unknown>) {
  const ref = useRef(save);
  ref.current = save;
  useEffect(() => {
    registerSaver(() => ref.current());
    return () => registerSaver(null);
  }, [registerSaver]);
}

/** Debounced background save while the buyer types ("Tự động lưu"). */
export function useAutosave(signature: string, save: () => Promise<unknown>, delayMs = 2500) {
  const initial = useRef(signature);
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (signature === initial.current) return;
    const timer = setTimeout(() => {
      initial.current = signature;
      void saveRef.current().catch(() => undefined);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [signature, delayMs]);
}

/** i18n text for an ApiError (`code` is a key in `common`). */
export function useErrorText() {
  const { t } = useTranslation('rfqWizard');
  return (e: unknown) => {
    const code = (e as { code?: string })?.code;
    return code ? t(`common:${code}`, { defaultValue: t('common:errors.generic') }) : t('common:errors.generic');
  };
}

/** Suppliers currently invited on the draft, in invitation order. */
export function invitedSuppliers(detail: RfqDetail): SupplierSummary[] {
  const byId = new Map(detail.invitations.map((i) => [i.supplier.id, i.supplier]));
  return detail.rfq.invitations.map((i) => byId.get(i.supplierId)).filter((s): s is SupplierSummary => Boolean(s));
}

/** Two-column wizard body: form on the left, summary on the right (stacks below 1024px). */
export function WizardLayout({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">{main}</div>
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-20 lg:col-span-4">{aside}</aside>
    </div>
  );
}

/** Form section card with the numbered title row used throughout BUY-06 → 06d. */
export function SectionCard({ icon, title, subtitle, aside, children, className }: { icon: string; title: ReactNode; subtitle?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card padding="md" className={className}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-outline-variant pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon name={icon} size={22} className="mt-px text-primary" />
          <div className="min-w-0">
            <h2 className="text-headline-sm text-on-surface">{title}</h2>
            {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

export function SummaryRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 text-body-sm', className)}>
      <span className="shrink-0 text-on-surface-variant">{label}</span>
      <span className="min-w-0 text-right font-medium text-on-surface">{children}</span>
    </div>
  );
}

export function SealedBidNote({ className }: { className?: string }) {
  const { t } = useTranslation('rfqWizard');
  return (
    <div className={clsx('flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant', className)}>
      <Icon name="visibility_off" size={16} className="mt-px text-outline" />
      <span>{t('common:labels.sealedBidNote')}</span>
    </div>
  );
}

/** Green "MOQ phù hợp (3.000 ≤ 5.000)" / amber "MOQ 10.000 > 5.000 (Cần đàm phán)" chip. */
export function MoqFitChip({ moq, quantity, short, wrap }: { moq: number; quantity: number; short?: boolean; wrap?: boolean }) {
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const fit = moqFit(moq, quantity);
  const values = { moq: f.number(moq), qty: f.number(quantity) };
  const label = short
    ? fit.fits
      ? t('moq.fitShort')
      : t('moq.negotiateShort')
    : fit.fits
      ? t(moq === quantity ? 'moq.fitEqual' : 'moq.fit', values)
      : t('moq.negotiate', values);
  return (
    <span
      className={clsx(
        'inline-flex items-center border px-2 py-0.5 text-label-sm',
        wrap ? 'rounded-lg' : 'whitespace-nowrap rounded-full',
        fit.fits ? 'border-success-border bg-success-container text-success' : 'border-warning-border bg-warning-container text-warning',
      )}
    >
      {label}
    </span>
  );
}

interface FooterProps {
  code: string;
  onSaveDraft: () => void;
  saving?: boolean;
  backLabel: string;
  onBack: () => void;
  nextLabel: string;
  nextIcon?: string;
  onNext: () => void;
  nextLoading?: boolean;
  nextDisabled?: boolean;
}

/** Sticky action bar at the bottom of every wizard step. */
export function WizardFooter({ code, onSaveDraft, saving, backLabel, onBack, nextLabel, nextIcon = 'arrow_forward', onNext, nextLoading, nextDisabled }: FooterProps) {
  const { t } = useTranslation('rfqWizard');
  return (
    <div className="sticky bottom-0 z-20 -mx-4 -mb-6 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-level-2 sm:-mx-6 sm:gap-3 sm:px-6 lg:-mb-8">
      <div className="flex flex-1 items-center gap-3 sm:flex-none">
        <Button variant="secondary" leftIcon="save" onClick={onSaveDraft} loading={saving} className="flex-1 sm:flex-none">
          {t('common:actions.saveDraft')}
        </Button>
        <span className="hidden text-body-sm text-on-surface-variant md:inline">
          {t('footer.draftCode')} <strong className="text-on-surface">{code}</strong>
        </span>
      </div>
      <Button variant="secondary" leftIcon="arrow_back" onClick={onBack} className="flex-1 sm:hidden">
        {backLabel}
      </Button>
      <div className="flex w-full gap-2 sm:w-auto sm:items-center">
        <Button variant="secondary" leftIcon="arrow_back" onClick={onBack} className="hidden sm:inline-flex">
          {backLabel}
        </Button>
        {nextIcon === 'send' ? (
          <Button leftIcon="send" onClick={onNext} loading={nextLoading} disabled={nextDisabled} className="!h-auto min-h-9 flex-1 py-2 !whitespace-normal sm:flex-none">
            {nextLabel}
          </Button>
        ) : (
          <Button rightIcon={nextIcon} onClick={onNext} loading={nextLoading} disabled={nextDisabled} className="!h-auto min-h-9 flex-1 py-2 !whitespace-normal sm:flex-none">
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
