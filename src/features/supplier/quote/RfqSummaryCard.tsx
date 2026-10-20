import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Card, Chip, Icon, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import { deadlineInfo } from '@/domain/rfq';
import { useFormat } from '@/hooks/useFormat';
import type { SupplierRfqView } from '@/services';

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('block text-label-sm uppercase tracking-wider text-outline', className)}>{children}</span>;
}

/** Left column of SUP-02/04: "Tóm tắt yêu cầu từ Buyer". */
export function RfqSummaryCard({ view }: { view: SupplierRfqView }) {
  const { t } = useTranslation('quote');
  const f = useFormat();
  const toast = useToast();
  const { rfq, buyer, buyerContact } = view;
  const urgent = deadlineInfo(rfq.deadline, clock.now()).urgency !== 'normal';
  const specs = [
    rfq.dimensions && t('summary.dimensions', { value: rfq.dimensions }),
    rfq.material && t('summary.material', { value: rfq.material }),
    rfq.finishing && t('summary.finishing', { value: rfq.finishing }),
  ].filter(Boolean) as string[];
  const notes = [rfq.buyerNote, rfq.terms.sampleRequired ? rfq.terms.sampleNote : '', rfq.terms.notesToSuppliers].filter((n): n is string => Boolean(n && n.trim()));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="contract" className="text-primary" />
          <h2 className="text-headline-sm text-on-surface">{t('summary.title')}</h2>
        </div>
        <span className="whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{t('summary.code', { code: rfq.code })}</span>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
        <Avatar initials={buyer.initials} tone="navy" square />
        <div className="min-w-0">
          <p className="truncate text-label-lg text-on-surface">{buyer.name}</p>
          <p className="truncate text-body-sm text-on-surface-variant">
            {buyerContact.name} · {buyerContact.title}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <SectionLabel>{t('summary.product')}</SectionLabel>
          <p className="mt-0.5 text-body-md font-semibold text-on-surface">{rfq.productName}</p>
          {specs.length > 0 && <p className="mt-0.5 text-body-sm text-on-surface-variant">{specs.join('. ')}.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/40 pt-3">
          <div>
            <SectionLabel>{t('summary.quantity')}</SectionLabel>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-headline-sm font-bold tabular-nums text-primary">{f.number(rfq.quantity)}</span>
              <span className="text-body-sm text-on-surface-variant">{rfq.unit}</span>
            </div>
          </div>
          <div>
            <SectionLabel>{t('summary.deadline')}</SectionLabel>
            <p className={clsx('mt-0.5 flex items-center gap-1 text-body-md font-semibold tabular-nums', urgent ? 'text-danger' : 'text-on-surface')}>
              <Icon name={urgent ? 'alarm' : 'event'} size={16} />
              {f.dateTime(rfq.deadline)}
            </p>
          </div>
        </div>

        <div className="border-t border-outline-variant/40 pt-3">
          <SectionLabel>{t('summary.delivery')}</SectionLabel>
          <div className="mt-1 flex items-start gap-2 text-body-sm text-on-surface">
            <Icon name="location_on" size={18} className="text-outline" />
            <span>{rfq.deliveryAddress}</span>
          </div>
          <p className="mt-1 pl-[26px] text-body-sm text-on-surface-variant">{t('summary.neededBy', { date: f.date(rfq.neededBy) })}</p>
        </div>
      </div>

      <div className="border-t border-outline-variant/60 pt-3">
        <SectionLabel className="mb-2">{t('summary.attachments')}</SectionLabel>
        {rfq.attachments.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">{t('summary.noAttachments')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rfq.attachments.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon name={file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'} size={24} className="text-danger" />
                  <div className="min-w-0">
                    <p className="truncate text-label-md text-on-surface" title={file.name}>
                      {file.name}
                    </p>
                    <p className="truncate text-label-sm font-normal text-outline">
                      {f.fileSize(file.sizeBytes)}
                      {file.description && ` • ${file.description}`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" leftIcon="download" className="text-primary" onClick={() => toast(t('states.notSupported', { ns: 'common' }), 'info')}>
                  {t('actions.download', { ns: 'common' })}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notes.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-warning-border bg-warning-container p-3 text-body-sm">
          <p className="flex items-center gap-1.5 font-semibold text-[#92400E]">
            <Icon name="info" size={16} className="text-warning" />
            {t('summary.buyerNotes')}
          </p>
          {notes.map((n) => (
            <p key={n} className="leading-relaxed text-[#92400E]">
              {n}
            </p>
          ))}
        </div>
      )}

      <dl className="flex flex-col gap-3 border-t border-outline-variant/40 pt-3">
        <div>
          <dt>
            <SectionLabel>{t('summary.certifications')}</SectionLabel>
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {rfq.terms.requiredCertifications.length ? (
              rfq.terms.requiredCertifications.map((c) => (
                <Chip key={c} icon="workspace_premium">
                  {c}
                </Chip>
              ))
            ) : (
              <span className="text-body-sm text-on-surface-variant">{t('summary.noCertifications')}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>
            <SectionLabel>{t('summary.paymentTerms')}</SectionLabel>
          </dt>
          <dd className="mt-0.5 text-body-sm text-on-surface">{rfq.terms.paymentTerms}</dd>
        </div>
        <div>
          <dt>
            <SectionLabel>{t('summary.minValidity')}</SectionLabel>
          </dt>
          <dd className="mt-0.5 text-body-sm text-on-surface">
            {t('time.days', { ns: 'common', count: rfq.terms.minValidityDays })}
            {' · '}
            {rfq.terms.vatIncluded ? t('summary.vatIncluded') : t('summary.vatExcluded')}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** "Cam kết quy trình Procura Trust" card. */
export function TrustCard() {
  const { t } = useTranslation('quote');
  return (
    <Card padding="sm">
      <h3 className="mb-3 flex items-center gap-2 text-label-lg text-on-surface">
        <Icon name="verified_user" size={18} className="text-primary" />
        {t('trust.title')}
      </h3>
      <div className="grid grid-cols-2 gap-3 text-body-sm">
        <div className="rounded-lg bg-surface-container-low p-2.5">
          <p className="text-label-sm text-outline">{t('trust.sla')}</p>
          <p className="mt-0.5 text-headline-sm font-bold text-on-surface">{t('trust.slaValue')}</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-2.5">
          <p className="text-label-sm text-outline">{t('trust.security')}</p>
          <p className="mt-1 flex items-center gap-1 text-label-md font-bold text-success">
            <Icon name="lock" size={16} />
            {t('trust.securityValue')}
          </p>
        </div>
      </div>
    </Card>
  );
}
