import clsx from 'clsx';
import { Fragment, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Breadcrumbs, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { useRfq } from '@/hooks/buyer';
import { useFormat } from '@/hooks/useFormat';
import type { Rfq } from '@/domain/types';
import { useErrorText, type StepProps } from './parts';
import Step1Info from './Step1Info';
import Step2Suppliers from './Step2Suppliers';
import Step3Terms from './Step3Terms';
import Step4Review from './Step4Review';
import { isStepReachable, parseStep, WIZARD_STEPS, type WizardStep } from './wizardHelpers';

/** BUY-06 → BUY-06d: four-step RFQ wizard over a persisted draft. */
export default function RfqWizardPage() {
  const { rfqId = '', step: rawStep } = useParams();
  const { t } = useTranslation('rfqWizard');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const query = useRfq(rfqId);
  const step = parseStep(rawStep);

  const [publishing, setPublishing] = useState(false);
  const saverRef = useRef<(() => Promise<unknown>) | null>(null);
  const registerSaver = useCallback((fn: (() => Promise<unknown>) | null) => {
    saverRef.current = fn;
  }, []);

  const goTo = useCallback(
    async (target: WizardStep | 'list') => {
      try {
        await saverRef.current?.();
      } catch (e) {
        toast(errorText(e), 'error');
        return;
      }
      navigate(target === 'list' ? '/buyer/rfqs' : `/buyer/rfqs/${rfqId}/edit/${target}`);
      window.scrollTo({ top: 0 });
    },
    [navigate, rfqId, toast, errorText],
  );

  if (!step) return <Navigate to={`/buyer/rfqs/${rfqId}/edit/1`} replace />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <LoadingState />;

  const detail = query.data;
  const { rfq } = detail;
  if (rfq.lifecycle !== 'draft') return <Navigate to={publishing ? `/buyer/rfqs/${rfq.id}/sent` : `/buyer/rfqs/${rfq.id}`} replace />;

  const props: StepProps = { detail, goTo: (s) => void goTo(s), registerSaver, setPublishing };
  const draftLabel = rfq.title ? t('breadcrumb.draftWithTitle', { code: rfq.code, title: rfq.title }) : t('breadcrumb.draft', { code: rfq.code });

  return (
    <>
      <header className="mb-5 flex flex-col gap-2">
        <Breadcrumbs items={[{ label: t('breadcrumb.list'), to: '/buyer/rfqs' }, { label: t('breadcrumb.new') }, { label: <span className="line-clamp-1">{draftLabel}</span> }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-headline-lg text-on-surface">{t('title')}</h1>
            <p className="mt-0.5 text-body-md text-on-surface-variant">{t('subtitle')}</p>
          </div>
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-1 text-body-sm text-on-surface-variant">
            <Icon name="cloud_done" size={14} className="text-tertiary" />
            {t('autosaved', { time: f.relative(rfq.updatedAt) })}
          </span>
        </div>
      </header>

      <WizardStepper rfq={rfq} current={step} onSelect={(s) => void goTo(s)} />

      {step === 1 && <Step1Info key={`${rfq.id}-1`} {...props} />}
      {step === 2 && <Step2Suppliers key={`${rfq.id}-2`} {...props} />}
      {step === 3 && <Step3Terms key={`${rfq.id}-3`} {...props} />}
      {step === 4 && <Step4Review key={`${rfq.id}-4`} {...props} />}
    </>
  );
}

function WizardStepper({ rfq, current, onSelect }: { rfq: Rfq; current: WizardStep; onSelect: (step: WizardStep) => void }) {
  const { t } = useTranslation('rfqWizard');
  return (
    <nav aria-label={t('stepper.label')} className="card mb-6 p-3 sm:p-4">
      <ol className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
        {WIZARD_STEPS.map((s, i) => {
          const isCurrent = s === current;
          const done = !isCurrent && s <= rfq.completedStep;
          const reachable = !isCurrent && isStepReachable(s, rfq.completedStep);
          const content = (
            <>
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md',
                  isCurrent && 'bg-primary text-on-primary ring-4 ring-primary-fixed',
                  done && 'bg-success-container text-success ring-1 ring-success-border',
                  !isCurrent && !done && 'bg-surface-container text-outline',
                )}
              >
                {done ? <Icon name="check" size={18} /> : s}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className={clsx('text-label-sm uppercase tracking-wide', isCurrent ? 'text-primary' : done ? 'text-success' : 'text-outline')}>
                  {t('stepper.stepN', { n: s })}
                </span>
                <span className={clsx('truncate text-label-md', isCurrent ? 'text-primary' : done ? 'text-on-surface' : 'text-on-surface-variant')}>{t(`steps.${s}`)}</span>
              </span>
            </>
          );
          return (
            <Fragment key={s}>
              {i > 0 && <li aria-hidden className={clsx('hidden h-px flex-1 md:block', s <= rfq.completedStep + 1 ? 'bg-success-border' : 'bg-outline-variant')} />}
              <li className="min-w-0">
                {reachable ? (
                  <button type="button" onClick={() => onSelect(s)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-container-low">
                    {content}
                  </button>
                ) : (
                  <div className={clsx('flex items-center gap-2.5 rounded-lg p-1.5', !isCurrent && 'opacity-70')} aria-current={isCurrent ? 'step' : undefined}>
                    {content}
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
