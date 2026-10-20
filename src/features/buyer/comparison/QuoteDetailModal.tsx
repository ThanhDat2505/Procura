import { useTranslation } from 'react-i18next';
import { Button, Chip, Icon, KeyValue, Modal, QuotationStatusBadge } from '@/components/ui';
import { quotationTotal, quotationValidUntil } from '@/domain/quotation';
import type { Quotation } from '@/domain/types';
import { useFormat } from '@/hooks/useFormat';

interface QuoteDetailModalProps {
  open: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  supplierName: string;
  supplierLocation?: string;
  quantity: number;
  unit: string;
}

/** Read-only view of every field of a received quotation (BUY-07 table and BUY-08 matrix). */
export function QuoteDetailModal({ open, onClose, quotation: q, supplierName, supplierLocation, quantity, unit }: QuoteDetailModalProps) {
  const { t } = useTranslation('comparison');
  const f = useFormat();
  if (!q) return null;
  const total = quotationTotal(q.unitPrice, quantity, q.moq);
  const effectiveQty = Math.max(quantity, q.moq);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('detail.title', { name: supplierName })}
      description={[q.code, supplierLocation].filter(Boolean).join(' · ')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common:actions.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <QuotationStatusBadge status={q.status} />
          {q.submittedAt && <span className="text-body-sm text-on-surface-variant">{t('detail.submittedAt', { time: f.dateTime(q.submittedAt) })}</span>}
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KeyValue label={t('detail.unitPrice')} value={<span className="font-semibold tabular-nums">{t('perUnit', { price: f.money(q.unitPrice), unit })}</span>} />
          <KeyValue
            label={t('detail.total', { qty: f.number(effectiveQty), unit })}
            value={<span className="font-semibold tabular-nums text-primary">{f.money(total)}</span>}
          />
          <KeyValue label={t('detail.moq')} value={<span className="tabular-nums">{`${f.number(q.moq)} ${unit}`}</span>} />
          <KeyValue label={t('detail.leadTime')} value={t('common:time.workingDays', { count: q.leadTimeDays })} />
          <KeyValue
            label={t('detail.validity')}
            value={t('detail.validityValue', { days: q.validityDays, date: f.date(quotationValidUntil(q)) })}
          />
          <KeyValue label={t('detail.vat')} value={q.vatIncluded ? t('detail.vatIncluded') : t('common:labels.vatExcluded')} />
          <KeyValue className="sm:col-span-2" label={t('detail.payment')} value={q.paymentTerms} />
          <KeyValue
            className="sm:col-span-2"
            label={t('detail.tooling')}
            value={
              <>
                {q.toolingCost > 0 ? t('detail.toolingCost', { cost: f.money(q.toolingCost) }) : t('detail.toolingFree')}
                {q.toolingNote && <span className="block text-body-sm text-on-surface-variant">{q.toolingNote}</span>}
              </>
            }
          />
          {q.samplePolicy && <KeyValue className="sm:col-span-2" label={t('detail.sample')} value={q.samplePolicy} />}
          <KeyValue
            className="sm:col-span-2"
            label={t('common:labels.certifications')}
            value={
              q.certifications.length ? (
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  {q.certifications.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </span>
              ) : (
                t('common:labels.none')
              )
            }
          />
        </dl>
        {(q.offerNotes || q.technicalNotes) && (
          <div className="flex flex-col gap-3 border-t border-outline-variant pt-4">
            {q.offerNotes && (
              <div>
                <p className="mb-1 text-label-md text-on-surface">{t('detail.offerNotes')}</p>
                <p className="whitespace-pre-line text-body-md text-on-surface-variant">{q.offerNotes}</p>
              </div>
            )}
            {q.technicalNotes && (
              <div>
                <p className="mb-1 text-label-md text-on-surface">{t('detail.technicalNotes')}</p>
                <p className="whitespace-pre-line text-body-md text-on-surface-variant">{q.technicalNotes}</p>
              </div>
            )}
          </div>
        )}
        {q.attachments.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-outline-variant pt-4">
            <p className="text-label-md text-on-surface">{t('detail.attachments')}</p>
            {q.attachments.map((a) => (
              <span key={a.id} className="flex items-center gap-2 text-body-md text-on-surface">
                <Icon name="description" size={18} className="text-primary" />
                {a.name}
                <span className="text-body-sm text-on-surface-variant">{f.fileSize(a.sizeBytes)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
