import clsx from 'clsx';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Avatar, Button, ButtonLink, Chip, Icon, IconButton } from '@/components/ui';
import type { SupplierSummary } from '@/domain/types';
import { useFormat } from '@/hooks/useFormat';

export function leadTimeLabel(t: TFunction, s: Pick<SupplierSummary, 'leadTimeMinDays' | 'leadTimeMaxDays'>): string {
  return s.leadTimeMinDays === s.leadTimeMaxDays
    ? t('discovery:leadTimeSingle', { count: s.leadTimeMinDays })
    : t('discovery:leadTimeRange', { min: s.leadTimeMinDays, max: s.leadTimeMaxDays });
}

export interface SupplierActionsProps {
  supplier: SupplierSummary;
  selected: boolean;
  onToggleSelect: () => void;
  saved: boolean;
  savePending: boolean;
  onToggleSave: () => void;
}

/** "Chọn gửi RFQ" ↔ "Đã chọn" toggle. */
export function SelectToggle({ selected, onToggle, name, size = 'sm' }: { selected: boolean; onToggle: () => void; name: string; size?: 'xs' | 'sm' }) {
  const { t } = useTranslation('discovery');
  return (
    <Button
      variant={selected ? 'primary' : 'outline'}
      size={size}
      leftIcon={selected ? 'check_circle' : 'add'}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={selected ? t('card.deselectAria', { name }) : t('card.selectAria', { name })}
    >
      {selected ? t('card.selected') : t('card.select')}
    </Button>
  );
}

export function BookmarkToggle({ saved, pending, onToggle, name }: { saved: boolean; pending: boolean; onToggle: () => void; name: string }) {
  const { t } = useTranslation('discovery');
  return (
    <IconButton
      icon="bookmark"
      filled={saved}
      size={18}
      label={saved ? t('card.unsaveAria', { name }) : t('card.saveAria', { name })}
      aria-pressed={saved}
      disabled={pending}
      onClick={onToggle}
      className={clsx('h-8 w-8 border border-outline-variant', saved ? 'bg-primary-fixed/30 text-primary hover:text-primary' : 'text-outline hover:text-primary')}
    />
  );
}

/** BUY-02 supplier card (grid view). */
export function SupplierCard({ supplier: s, selected, onToggleSelect, saved, savePending, onToggleSave }: SupplierActionsProps) {
  const { t } = useTranslation('discovery');
  const f = useFormat();
  const profile = `/buyer/suppliers/${s.id}`;
  return (
    <article
      className={clsx(
        'card flex flex-col justify-between p-4 transition-shadow hover:shadow-level-2',
        selected && 'border-primary ring-1 ring-primary',
      )}
      aria-label={s.name}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar initials={s.initials} size="md" square tone={selected ? 'primary' : 'neutral'} />
            <div className="min-w-0">
              <div className="flex items-start gap-1.5">
                <h3 className="text-headline-sm text-on-surface">
                  <Link to={profile} className="hover:text-primary">
                    {s.name}
                  </Link>
                </h3>
                {s.verified && <Icon name="verified" filled size={18} className="mt-0.5 text-primary" label={t('common:labels.verifiedByProcura')} />}
              </div>
              <span className="mt-0.5 flex items-center gap-1 text-body-sm text-outline">
                <Icon name="location_on" size={14} />
                {s.locationLabel}
              </span>
            </div>
          </div>
          <div className="flex max-w-[36%] shrink-0 flex-col items-end text-right">
            <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-0.5 text-label-sm">
              <Icon name="star" filled size={14} className="text-[#F59E0B]" />
              <strong className="tabular-nums text-on-surface">{s.rating.toFixed(1)}</strong>
              <span className="font-normal text-outline">({s.reviewCount})</span>
            </span>
            <span className="mt-1 text-[11px] font-medium leading-4 text-primary">{s.tagline}</span>
          </div>
        </div>

        <div className="mt-3 border-t border-outline-variant pt-3">
          <span className="mb-1 block text-label-sm text-outline">{t('card.highlightProducts')}</span>
          <div className="flex flex-wrap gap-1.5">
            {s.highlightProducts.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-container-low p-2 text-center">
          <div>
            <dt className="text-[11px] text-outline">{t('common:labels.moq')}</dt>
            <dd className="text-label-md tabular-nums text-on-surface">
              {f.number(s.moq)} {s.moqUnit}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-outline">{t('card.leadTime')}</dt>
            <dd className="text-label-md tabular-nums text-on-surface">{leadTimeLabel(t, s)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-outline">{t('common:labels.certifications')}</dt>
            <dd className="truncate text-label-md text-on-surface" title={s.certifications.join(', ')}>
              {s.certifications.length ? s.certifications.slice(0, 2).join(', ') : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-3">
        <SelectToggle selected={selected} onToggle={onToggleSelect} name={s.name} />
        <div className="flex items-center gap-1.5">
          <ButtonLink to={profile} variant="secondary" size="sm">
            {t('common:actions.viewProfile')}
          </ButtonLink>
          <BookmarkToggle saved={saved} pending={savePending} onToggle={onToggleSave} name={s.name} />
        </div>
      </div>
    </article>
  );
}
