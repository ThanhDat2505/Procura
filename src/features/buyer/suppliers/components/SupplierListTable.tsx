import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Avatar, Card, Icon, RatingInline, Table, Td, Th, THead, Tr } from '@/components/ui';
import type { ID, SupplierSummary } from '@/domain/types';
import { useFormat } from '@/hooks/useFormat';
import { BookmarkToggle, leadTimeLabel, SelectToggle } from './SupplierCard';

interface Props {
  suppliers: SupplierSummary[];
  isSelected: (id: ID) => boolean;
  onToggleSelect: (s: SupplierSummary) => void;
  isSaved: (id: ID) => boolean;
  isSavePending: (id: ID) => boolean;
  onToggleSave: (s: SupplierSummary) => void;
}

/** BUY-02 compact list view. */
export function SupplierListTable({ suppliers, isSelected, onToggleSelect, isSaved, isSavePending, onToggleSave }: Props) {
  const { t } = useTranslation('discovery');
  const f = useFormat();
  return (
    <Card padding="none" className="overflow-hidden">
      <Table minWidth={900}>
        <THead>
          <tr>
            <Th>{t('list.supplier')}</Th>
            <Th>{t('common:labels.rating')}</Th>
            <Th className="text-right">{t('common:labels.moq')}</Th>
            <Th>{t('card.leadTime')}</Th>
            <Th>{t('common:labels.certifications')}</Th>
            <Th className="bg-[#F8FAFC] text-right md:sticky md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">{t('common:labels.actions')}</Th>
          </tr>
        </THead>
        <tbody>
          {suppliers.map((s) => (
            <Tr key={s.id} selected={isSelected(s.id)}>
              <Td className="min-w-[280px]">
                <div className="flex items-center gap-3">
                  <Avatar initials={s.initials} size="md" square tone={isSelected(s.id) ? 'primary' : 'neutral'} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <Link to={`/buyer/suppliers/${s.id}`} className="text-label-lg text-on-surface hover:text-primary">
                        {s.name}
                      </Link>
                      {s.verified && <Icon name="verified" filled size={16} className="text-primary" label={t('common:labels.verifiedByProcura')} />}
                    </div>
                    <span className="flex items-center gap-1 text-body-sm text-outline">
                      <Icon name="location_on" size={14} />
                      {s.locationLabel}
                    </span>
                  </div>
                </div>
              </Td>
              <Td>
                <RatingInline value={s.rating} count={s.reviewCount} />
              </Td>
              <Td className="whitespace-nowrap text-right tabular-nums">
                {f.number(s.moq)} {s.moqUnit}
              </Td>
              <Td className="whitespace-nowrap">{leadTimeLabel(t, s)}</Td>
              <Td className="max-w-[180px] text-body-sm" title={s.certifications.join(', ')}>
                {s.certifications.length ? s.certifications.slice(0, 2).join(', ') : '—'}
              </Td>
              <Td className="md:sticky md:bg-surface-container-lowest md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(8,8,96,0.12)]">
                <div className="flex items-center justify-end gap-1.5">
                  <SelectToggle selected={isSelected(s.id)} onToggle={() => onToggleSelect(s)} name={s.name} size="xs" />
                  <BookmarkToggle saved={isSaved(s.id)} pending={isSavePending(s.id)} onToggle={() => onToggleSave(s)} name={s.name} />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
