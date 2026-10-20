import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, ConfirmDialog, Field, Icon, IconButton, Input, Modal, Select, Switch, Table, Td, Th, THead, Tr, Textarea, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import type { ProductionLine, Supplier } from '@/domain/types';
import { useDeleteProductionLine, useSaveProductionLine, useUpdateProfile } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { FactoryPhotoTile, ProfileGate, RowActions, SectionTitle, useErrorToast } from './components';
import { lineKindCounts, parseList } from './profileHelpers';
import {
  capabilitySchema,
  productionLineSchema,
  samplePolicySchema,
  type CapabilityFormValues,
  type ProductionLineFormValues,
  type SamplePolicyFormValues,
} from './profileSchemas';

/** SUP-05b — Năng lực sản xuất. */
export default function CapacityTab() {
  return (
    <ProfileGate>
      {(supplier) => (
        <div className="flex flex-col gap-6">
          <CapabilityKpis supplier={supplier} />
          <ProductionLinesCard lines={supplier.productionLines} />
          <MaterialsCard materials={supplier.materials} />
          <SamplePolicyCard supplier={supplier} />
          <PhotoLibraryCard supplier={supplier} />
        </div>
      )}
    </ProfileGate>
  );
}

// ---------------------------------------------------------------------------
// KPI cards + capability modal
// ---------------------------------------------------------------------------

function CapabilityKpis({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const [open, setOpen] = useState(false);
  const cap = supplier.capability;
  const lines = lineKindCounts(supplier.productionLines);
  const kpis = [
    { key: 'area', label: t('general.kpi.area'), value: f.number(cap.factoryAreaM2), unit: 'm²', note: t('general.kpi.areaNote') },
    { key: 'capacity', label: t('general.kpi.capacity'), value: f.number(cap.monthlyCapacity), note: t('general.kpi.capacityNote', { unit: cap.capacityUnit }) },
    { key: 'lines', label: t('general.kpi.lines'), value: f.number(cap.lineCount), unit: t('general.kpi.linesUnit'), note: t('general.kpi.linesNote', lines) },
    { key: 'staff', label: t('general.kpi.staff'), value: f.number(cap.technicalStaff), unit: t('general.kpi.staffUnit'), note: t('general.kpi.staffNote') },
  ];
  return (
    <section aria-label={t('capacity.kpiAria')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.key} className="card flex flex-col justify-between p-4 transition-colors hover:border-primary">
          <div className="flex items-start justify-between gap-2">
            <span className="text-label-sm uppercase tracking-wider text-outline">{k.label}</span>
            <IconButton icon="edit" size={18} label={t('capacity.editKpi', { name: k.label })} className="-mr-1 -mt-1" onClick={() => setOpen(true)} />
          </div>
          <div className="mt-2">
            <p className="flex flex-wrap items-baseline gap-1">
              <span className="text-display-sm tabular-nums text-on-surface">{k.value}</span>
              {k.unit && <span className="text-headline-sm font-normal text-on-surface-variant">{k.unit}</span>}
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">{k.note}</p>
          </div>
        </div>
      ))}
      <CapabilityModal open={open} onClose={() => setOpen(false)} supplier={supplier} />
    </section>
  );
}

function CapabilityModal({ open, onClose, supplier }: { open: boolean; onClose: () => void; supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const update = useUpdateProfile();
  const formId = useId();
  const cap = supplier.capability;
  const { register, handleSubmit, formState, reset } = useForm<CapabilityFormValues>({
    resolver: zodResolver(capabilitySchema),
    values: { factoryAreaM2: cap.factoryAreaM2, monthlyCapacity: cap.monthlyCapacity, lineCount: cap.lineCount, technicalStaff: cap.technicalStaff },
  });
  const e = formState.errors;
  const close = () => {
    reset();
    onClose();
  };
  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ capability: { ...cap, ...v } });
      toast(t('common:toast.saved'));
      onClose();
    } catch (err) {
      showError(err);
    }
  });
  return (
    <Modal
      open={open}
      onClose={close}
      title={t('capacity.capabilityModal')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={update.isPending}>
            {t('common:actions.saveChanges')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('general.kpi.area')} htmlFor="cap-area" required error={e.factoryAreaM2?.message}>
          <Input id="cap-area" type="number" min={1} suffix="m²" invalid={!!e.factoryAreaM2} {...register('factoryAreaM2', { valueAsNumber: true })} />
        </Field>
        <Field label={t('general.kpi.capacity')} htmlFor="cap-cap" required error={e.monthlyCapacity?.message}>
          <Input id="cap-cap" type="number" min={1} suffix={t('capacity.perMonth')} invalid={!!e.monthlyCapacity} {...register('monthlyCapacity', { valueAsNumber: true })} />
        </Field>
        <Field label={t('general.kpi.lines')} htmlFor="cap-lines" required error={e.lineCount?.message}>
          <Input id="cap-lines" type="number" min={0} suffix={t('general.kpi.linesUnit')} invalid={!!e.lineCount} {...register('lineCount', { valueAsNumber: true })} />
        </Field>
        <Field label={t('general.kpi.staff')} htmlFor="cap-staff" required error={e.technicalStaff?.message}>
          <Input id="cap-staff" type="number" min={0} suffix={t('general.kpi.staffUnit')} invalid={!!e.technicalStaff} {...register('technicalStaff', { valueAsNumber: true })} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Production lines
// ---------------------------------------------------------------------------

function ProductionLinesCard({ lines }: { lines: ProductionLine[] }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const remove = useDeleteProductionLine();
  const [editing, setEditing] = useState<ProductionLine | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ProductionLine | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast(t('capacity.lineDeleted', { name: deleting.name }));
      setDeleting(null);
    } catch (err) {
      showError(err);
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SectionTitle icon="precision_manufacturing">{t('capacity.linesTitle')}</SectionTitle>
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{t('capacity.linesCount', { count: lines.length })}</span>
        </div>
        <Button leftIcon="add" onClick={() => setEditing('new')}>
          {t('capacity.addLine')}
        </Button>
      </div>
      {lines.length === 0 ? (
        <p className="p-8 text-center text-body-md text-on-surface-variant">{t('capacity.noLines')}</p>
      ) : (
        <Table minWidth={860}>
          <THead>
            <tr>
              <Th>{t('capacity.col.name')}</Th>
              <Th>{t('capacity.col.equipment')}</Th>
              <Th>{t('capacity.col.capacity')}</Th>
              <Th className="text-center">{t('capacity.col.year')}</Th>
              <Th>{t('capacity.col.status')}</Th>
              <Th className="text-right">{t('common:labels.actions')}</Th>
            </tr>
          </THead>
          <tbody>
            {lines.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium text-on-surface">
                  <span className="flex items-center gap-2">
                    <Icon name={l.kind === 'printing' ? 'print' : 'settings'} size={18} className="text-outline" />
                    {l.name}
                  </span>
                </Td>
                <Td className="text-on-surface-variant">{l.equipmentType}</Td>
                <Td className="whitespace-nowrap font-medium">{l.capacity}</Td>
                <Td className="text-center text-on-surface-variant">{l.yearInstalled}</Td>
                <Td>
                  <Badge tone={l.status === 'active' ? 'success' : 'warning'} dot>
                    {t(`capacity.status.${l.status}`)}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <RowActions onEdit={() => setEditing(l)} onDelete={() => setDeleting(l)} name={l.name} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="border-t border-outline-variant bg-surface-container-low/30 px-4 py-3 text-body-sm text-on-surface-variant">
        {t('capacity.linesFooter', { shown: lines.length, count: lines.length })}
      </div>

      <LineModal key={editing === 'new' ? 'new' : (editing?.id ?? 'none')} line={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t('capacity.deleteLineTitle')}
        description={t('capacity.deleteLineBody', { name: deleting?.name ?? '' })}
        confirmLabel={t('common:actions.delete')}
        tone="danger"
        loading={remove.isPending}
      />
    </Card>
  );
}

function LineModal({ line, onClose }: { line: ProductionLine | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const save = useSaveProductionLine();
  const formId = useId();
  const currentYear = clock.now().getFullYear();
  const schema = useMemo(() => productionLineSchema(currentYear), [currentYear]);
  const existing = line && line !== 'new' ? line : null;
  const { register, handleSubmit, formState } = useForm<ProductionLineFormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? { name: existing.name, kind: existing.kind, equipmentType: existing.equipmentType, capacity: existing.capacity, yearInstalled: existing.yearInstalled, status: existing.status }
      : { name: '', kind: 'corrugating', equipmentType: '', capacity: '', yearInstalled: currentYear, status: 'active' },
  });
  const e = formState.errors;
  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(existing ? { ...v, id: existing.id } : v);
      toast(existing ? t('capacity.lineUpdated') : t('capacity.lineAdded', { name: v.name }));
      onClose();
    } catch (err) {
      showError(err);
    }
  });

  return (
    <Modal
      open={line !== null}
      onClose={onClose}
      title={existing ? t('capacity.editLine') : t('capacity.addLine')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            {existing ? t('common:actions.saveChanges') : t('capacity.addLine')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('capacity.col.name')} htmlFor="ln-name" required error={e.name?.message} className="sm:col-span-2">
          <Input id="ln-name" placeholder={t('capacity.namePlaceholder')} invalid={!!e.name} {...register('name')} />
        </Field>
        <Field label={t('capacity.kindLabel')} htmlFor="ln-kind" required>
          <Select id="ln-kind" {...register('kind')}>
            <option value="corrugating">{t('capacity.kind.corrugating')}</option>
            <option value="printing">{t('capacity.kind.printing')}</option>
          </Select>
        </Field>
        <Field label={t('capacity.col.equipment')} htmlFor="ln-eq" required error={e.equipmentType?.message}>
          <Input id="ln-eq" placeholder={t('capacity.equipmentPlaceholder')} invalid={!!e.equipmentType} {...register('equipmentType')} />
        </Field>
        <Field label={t('capacity.col.capacity')} htmlFor="ln-cap" required error={e.capacity?.message}>
          <Input id="ln-cap" placeholder={t('capacity.capacityPlaceholder')} invalid={!!e.capacity} {...register('capacity')} />
        </Field>
        <Field label={t('capacity.col.year')} htmlFor="ln-year" required error={e.yearInstalled?.message}>
          <Input id="ln-year" type="number" inputMode="numeric" invalid={!!e.yearInstalled} {...register('yearInstalled', { valueAsNumber: true })} />
        </Field>
        <Field label={t('capacity.col.status')} htmlFor="ln-status" required className="sm:col-span-2">
          <Select id="ln-status" {...register('status')}>
            <option value="active">{t('capacity.status.active')}</option>
            <option value="maintenance">{t('capacity.status.maintenance')}</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

type Materials = Supplier['materials'];
const MATERIAL_GROUPS: { key: keyof Materials; dot: string }[] = [
  { key: 'flutes', dot: 'bg-primary' },
  { key: 'papers', dot: 'bg-secondary' },
  { key: 'finishing', dot: 'bg-tertiary' },
];

function MaterialsCard({ materials }: { materials: Materials }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const update = useUpdateProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<keyof Materials, string>>({ flutes: '', papers: '', finishing: '' });
  const formId = useId();

  const openModal = () => {
    setDraft({ flutes: materials.flutes.join(', '), papers: materials.papers.join(', '), finishing: materials.finishing.join(', ') });
    setOpen(true);
  };
  const save = async () => {
    try {
      await update.mutateAsync({ materials: { flutes: parseList(draft.flutes), papers: parseList(draft.papers), finishing: parseList(draft.finishing) } });
      toast(t('common:toast.saved'));
      setOpen(false);
    } catch (err) {
      showError(err);
    }
  };

  return (
    <Card padding="md" className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <SectionTitle icon="category">{t('capacity.materialsTitle')}</SectionTitle>
        <IconButton icon="edit" size={18} label={t('capacity.editMaterials')} onClick={openModal} />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {MATERIAL_GROUPS.map((g) => (
          <div key={g.key} className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-1.5 text-label-md text-on-surface">
              <span className={`h-2 w-2 rounded-full ${g.dot}`} aria-hidden />
              {t(`capacity.materials.${g.key}`)}
            </h3>
            {materials[g.key].length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">{t('capacity.materialsEmpty')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {materials[g.key].map((m) => (
                  <li key={m} className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('capacity.editMaterials')}
        description={t('capacity.materialsHint')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" form={formId} loading={update.isPending}>
              {t('common:actions.saveChanges')}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void save();
          }}
        >
          {MATERIAL_GROUPS.map((g) => (
            <Field key={g.key} label={t(`capacity.materials.${g.key}`)} htmlFor={`mat-${g.key}`}>
              <Textarea id={`mat-${g.key}`} rows={2} value={draft[g.key]} onChange={(ev) => setDraft((d) => ({ ...d, [g.key]: ev.target.value }))} />
            </Field>
          ))}
        </form>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MOQ & sample policy
// ---------------------------------------------------------------------------

function SamplePolicyCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const update = useUpdateProfile();
  const [open, setOpen] = useState(false);
  const sp = supplier.samplePolicy;

  const toggleFree = async (freeSample: boolean) => {
    try {
      await update.mutateAsync({ samplePolicy: { ...sp, freeSample } });
      toast(freeSample ? t('capacity.freeSampleOn') : t('capacity.freeSampleOff'));
    } catch (err) {
      showError(err);
    }
  };

  const tile = 'flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3.5';
  const tileLabel = 'text-label-sm uppercase tracking-wider text-outline';
  const tileNote = 'mt-2 border-t border-outline-variant/60 pt-2 text-body-sm text-on-surface-variant';
  const unitCls = 'text-label-md font-medium text-on-surface-variant';

  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <SectionTitle icon="handshake">{t('capacity.sampleTitle')}</SectionTitle>
        <IconButton icon="edit" size={18} label={t('capacity.editSample')} onClick={() => setOpen(true)} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={tile}>
          <div className="flex flex-col">
            <span className={tileLabel}>{t('capacity.defaultMoq')}</span>
            <span className="mt-1 text-headline-md tabular-nums text-on-surface">
              {f.number(sp.defaultMoq)} <span className={unitCls}>{supplier.capability.capacityUnit}</span>
            </span>
          </div>
          <p className={tileNote}>{t('capacity.defaultMoqNote')}</p>
        </div>
        <div className={tile}>
          <div className="flex flex-col">
            <span className={tileLabel}>{t('capacity.sampleLeadTime')}</span>
            <span className="mt-1 text-headline-md tabular-nums text-on-surface">
              {f.number(sp.sampleLeadTimeHours)} <span className={unitCls}>{t('common:units.hours')}</span>
            </span>
          </div>
          <p className={tileNote}>{t('capacity.sampleLeadTimeNote')}</p>
        </div>
        <div className={tile}>
          <div>
            <div className="mb-1 flex items-start justify-between gap-2">
              <label className={tileLabel} htmlFor="free-sample-switch">
                {t('capacity.freeSample')}
              </label>
              <Switch checked={sp.freeSample} onChange={(v) => void toggleFree(v)} disabled={update.isPending} id="free-sample-switch" />
            </div>
            {sp.freeSample ? (
              <span className="mt-1 inline-flex items-center gap-1 text-label-md text-success">
                <Icon name="check_circle" size={16} />
                {t('capacity.freeSampleActive')}
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                <Icon name="block" size={16} />
                {t('capacity.freeSampleInactive')}
              </span>
            )}
          </div>
          <p className={tileNote}>{sp.freeSample ? t('capacity.freeSampleNote', { count: sp.freeSampleMinOrder, n: f.number(sp.freeSampleMinOrder), unit: supplier.capability.capacityUnit }) : t('capacity.paidSampleNote')}</p>
        </div>
        <div className={tile}>
          <div className="flex flex-col">
            <span className={tileLabel}>{t('capacity.standardLeadTime')}</span>
            <span className="mt-1 text-headline-md tabular-nums text-on-surface">
              {sp.standardLeadTimeMinDays === sp.standardLeadTimeMaxDays ? sp.standardLeadTimeMinDays : `${sp.standardLeadTimeMinDays} – ${sp.standardLeadTimeMaxDays}`}{' '}
              <span className={unitCls}>{t('common:units.workingDays')}</span>
            </span>
          </div>
          <p className={tileNote}>{t('capacity.standardLeadTimeNote')}</p>
        </div>
      </div>
      <SamplePolicyModal key={open ? 'open' : 'closed'} open={open} onClose={() => setOpen(false)} supplier={supplier} />
    </Card>
  );
}

function SamplePolicyModal({ open, onClose, supplier }: { open: boolean; onClose: () => void; supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const update = useUpdateProfile();
  const formId = useId();
  const { register, handleSubmit, formState, control } = useForm<SamplePolicyFormValues>({
    resolver: zodResolver(samplePolicySchema),
    defaultValues: supplier.samplePolicy,
  });
  const e = formState.errors;
  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({ samplePolicy: v });
      toast(t('common:toast.saved'));
      onClose();
    } catch (err) {
      showError(err);
    }
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('capacity.editSample')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={update.isPending}>
            {t('common:actions.saveChanges')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('capacity.defaultMoq')} htmlFor="sp-moq" required error={e.defaultMoq?.message}>
          <Input id="sp-moq" type="number" min={1} suffix={supplier.capability.capacityUnit} invalid={!!e.defaultMoq} {...register('defaultMoq', { valueAsNumber: true })} />
        </Field>
        <Field label={t('capacity.sampleLeadTime')} htmlFor="sp-lt" required error={e.sampleLeadTimeHours?.message}>
          <Input id="sp-lt" type="number" min={1} suffix={t('common:units.hours')} invalid={!!e.sampleLeadTimeHours} {...register('sampleLeadTimeHours', { valueAsNumber: true })} />
        </Field>
        <Field label={t('capacity.leadMin')} htmlFor="sp-min" required error={e.standardLeadTimeMinDays?.message}>
          <Input id="sp-min" type="number" min={1} suffix={t('common:units.days')} invalid={!!e.standardLeadTimeMinDays} {...register('standardLeadTimeMinDays', { valueAsNumber: true })} />
        </Field>
        <Field label={t('capacity.leadMax')} htmlFor="sp-max" required error={e.standardLeadTimeMaxDays?.message}>
          <Input id="sp-max" type="number" min={1} suffix={t('common:units.days')} invalid={!!e.standardLeadTimeMaxDays} {...register('standardLeadTimeMaxDays', { valueAsNumber: true })} />
        </Field>
        <Controller
          control={control}
          name="freeSample"
          render={({ field }) => (
            <Switch className="sm:col-span-2" checked={field.value} onChange={field.onChange} label={t('capacity.freeSample')} description={t('capacity.freeSampleHint')} />
          )}
        />
        <Field label={t('capacity.freeSampleMinOrder')} htmlFor="sp-free" error={e.freeSampleMinOrder?.message} className="sm:col-span-2">
          <Input id="sp-free" type="number" min={0} suffix={supplier.capability.capacityUnit} invalid={!!e.freeSampleMinOrder} {...register('freeSampleMinOrder', { valueAsNumber: true })} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Photo library
// ---------------------------------------------------------------------------

function PhotoLibraryCard({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const audited = supplier.photos.filter((p) => p.audited).length;
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SectionTitle icon="photo_library">{t('capacity.photosTitle')}</SectionTitle>
          <Badge tone="success">{t('capacity.auditedCount', { count: audited })}</Badge>
        </div>
        <span className="text-body-sm text-outline">{t('capacity.photosNote')}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {supplier.photos.map((p) => (
          <FactoryPhotoTile key={p.id} photo={p} showAudited compact />
        ))}
        <button
          type="button"
          onClick={() => toast(t('common:states.notSupported'), 'info')}
          className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low/40 p-4 text-center transition-colors hover:border-primary hover:bg-surface-container-low"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-outline transition-colors group-hover:bg-primary-fixed group-hover:text-primary">
            <Icon name="add_photo_alternate" />
          </span>
          <span className="text-label-sm text-on-surface group-hover:text-primary">{t('photos.add')}</span>
          <span className="text-[11px] text-outline">{t('photos.formats')}</span>
        </button>
      </div>
    </Card>
  );
}
