import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  AttachmentRow,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FileDropzone,
  Input,
  LoadingState,
  MoneyInput,
  Select,
  Switch,
  Table,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui';
import { UNITS } from '@/domain/catalog';
import type { Attachment, Product } from '@/domain/types';
import { useDeleteProduct, useMyProducts, useSaveProduct } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { RowActions, useErrorToast } from './components';
import { matchesCertification, PRODUCT_CERTIFICATIONS, productSchema, type ProductFormValues } from './profileSchemas';

const ALL = '__all__';
const NEW_GROUP = '__new__';

/** SUP-05c — Danh mục sản phẩm. */
export default function ProductsTab() {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const products = useMyProducts();
  const save = useSaveProduct();
  const remove = useDeleteProduct();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(ALL);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const list = useMemo(() => products.data ?? [], [products.data]);
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of list) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [list]);
  const q = query.trim().toLowerCase();
  const filtered = list.filter((p) => (group === ALL || p.group === group) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q)));

  const toggleVisible = async (p: Product, visibleToBuyers: boolean) => {
    const { id, supplierId: _supplierId, ...rest } = p;
    try {
      await save.mutateAsync({ ...rest, id, visibleToBuyers });
      toast(visibleToBuyers ? t('products.shown', { name: p.name }) : t('products.hidden', { name: p.name }));
    } catch (err) {
      showError(err);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast(t('products.deleted', { name: deleting.name }));
      setDeleting(null);
    } catch (err) {
      showError(err);
    }
  };

  if (products.isError) {
    return (
      <Card>
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      </Card>
    );
  }
  if (!products.data) return <LoadingState rows={5} />;

  const chip = (active: boolean) =>
    clsx(
      'h-8 shrink-0 whitespace-nowrap rounded-lg px-3 text-label-sm transition-colors',
      active ? 'bg-on-surface text-surface-container-lowest' : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low',
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Input
            className="w-full sm:w-80"
            leftIcon="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            aria-label={t('products.searchPlaceholder')}
          />
          <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto" role="group" aria-label={t('products.groupFilter')}>
            <button type="button" className={chip(group === ALL)} aria-pressed={group === ALL} onClick={() => setGroup(ALL)}>
              {t('products.allGroups', { count: list.length })}
            </button>
            {groups.map((g) => (
              <button key={g.name} type="button" className={chip(group === g.name)} aria-pressed={group === g.name} onClick={() => setGroup(g.name)}>
                {g.name} <span className="tabular-nums opacity-80">({g.count})</span>
              </button>
            ))}
          </div>
        </div>
        <Button leftIcon="add" onClick={() => setEditing('new')}>
          {t('products.add')}
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon="inventory_2"
            title={list.length === 0 ? t('products.emptyTitle') : t('common:states.noResults')}
            description={list.length === 0 ? t('products.emptyBody') : undefined}
            action={
              list.length === 0 && (
                <Button leftIcon="add" onClick={() => setEditing('new')}>
                  {t('products.add')}
                </Button>
              )
            }
          />
        ) : (
          <Table minWidth={1120}>
            <THead>
              <tr>
                <Th>{t('products.col.name')}</Th>
                <Th>{t('products.col.sku')}</Th>
                <Th>{t('common:labels.moq')}</Th>
                <Th>{t('products.col.price')}</Th>
                <Th>{t('common:labels.leadTime')}</Th>
                <Th>{t('common:labels.certifications')}</Th>
                <Th className="text-center">{t('products.col.visible')}</Th>
                <Th className="text-right">{t('common:labels.actions')}</Th>
              </tr>
            </THead>
            <tbody>
              {filtered.map((p) => (
                <Tr key={p.id}>
                  <Td className="max-w-[300px]">
                    <p className="text-label-md text-on-surface">{p.name}</p>
                    <p className="mt-0.5 text-body-sm text-outline">{p.spec}</p>
                  </Td>
                  <Td className="whitespace-nowrap font-medium text-primary">{p.sku}</Td>
                  <Td className="whitespace-nowrap font-medium">
                    {f.number(p.moq)} {p.unit}
                  </Td>
                  <Td className="whitespace-nowrap font-semibold text-on-surface">
                    {f.number(p.priceMin)} – {f.number(p.priceMax)} {t('products.perUnit', { unit: p.unit })}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {p.leadTimeMinDays === p.leadTimeMaxDays ? t('common:time.days', { count: p.leadTimeMinDays }) : t('products.leadRange', { min: p.leadTimeMinDays, max: p.leadTimeMaxDays })}
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {p.certifications.map((c) => (
                        <span
                          key={c}
                          className={clsx(
                            'whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold',
                            c.startsWith('FSC') ? 'border border-success-border bg-success-container text-success' : 'bg-surface-container text-on-surface-variant',
                          )}
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                  </Td>
                  <Td className="relative text-center">
                    <label htmlFor={`vis-${p.id}`} className="sr-only">
                      {t('products.visibleFor', { name: p.name })}
                    </label>
                    <Switch id={`vis-${p.id}`} checked={p.visibleToBuyers} onChange={(v) => void toggleVisible(p, v)} disabled={save.isPending} />
                  </Td>
                  <Td className="text-right">
                    <RowActions name={p.name} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} separator="/" />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low/50 px-4 py-3 text-body-sm text-outline">
          <span>{t('products.footer', { shown: filtered.length, count: list.length })}</span>
        </div>
      </Card>

      <ProductDrawer key={editing === 'new' ? 'new' : (editing?.id ?? 'none')} product={editing} products={list} groups={groups.map((g) => g.name)} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t('products.deleteTitle')}
        description={t('products.deleteBody', { name: deleting?.name ?? '', sku: deleting?.sku ?? '' })}
        confirmLabel={t('common:actions.delete')}
        tone="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

function ProductDrawer({ product, products, groups, onClose }: { product: Product | 'new' | null; products: Product[]; groups: string[]; onClose: () => void }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const save = useSaveProduct();
  const formId = useId();
  const existing = product && product !== 'new' ? product : null;
  const [images, setImages] = useState<Attachment[]>([]);
  const [groupChoice, setGroupChoice] = useState(existing?.group ?? groups[0] ?? NEW_GROUP);

  const { register, handleSubmit, formState, control, setValue, setError } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          sku: existing.sku,
          group: existing.group,
          spec: existing.spec,
          moq: existing.moq,
          unit: existing.unit,
          priceMin: existing.priceMin,
          priceMax: existing.priceMax,
          leadTimeMinDays: existing.leadTimeMinDays,
          leadTimeMaxDays: existing.leadTimeMaxDays,
          certifications: existing.certifications,
          visibleToBuyers: existing.visibleToBuyers,
        }
      : {
          name: '',
          sku: '',
          group: groups[0] ?? '',
          spec: '',
          moq: Number.NaN,
          unit: 'cái',
          priceMin: Number.NaN,
          priceMax: Number.NaN,
          leadTimeMinDays: Number.NaN,
          leadTimeMaxDays: Number.NaN,
          certifications: [],
          visibleToBuyers: true,
        },
  });
  const e = formState.errors;

  const submit = handleSubmit(async (v) => {
    const sku = v.sku.trim();
    if (products.some((p) => p.id !== existing?.id && p.sku.toLowerCase() === sku.toLowerCase())) {
      setError('sku', { message: 'errors.duplicateSku' });
      return;
    }
    try {
      await save.mutateAsync({ ...v, sku, ...(existing ? { id: existing.id } : {}) });
      toast(existing ? t('products.updated', { name: v.name }) : t('products.added', { name: v.name }));
      onClose();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'errors.duplicateSku') setError('sku', { message: code });
      else showError(err);
    }
  });

  return (
    <Drawer
      open={product !== null}
      onClose={onClose}
      width={440}
      title={existing ? t('products.editTitle') : t('products.addTitle')}
      description={t('products.drawerSubtitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} leftIcon="save" loading={save.isPending}>
            {t('products.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t('products.f.name')} htmlFor="pd-name" required error={e.name?.message}>
          <Input id="pd-name" placeholder={t('products.f.namePlaceholder')} invalid={!!e.name} {...register('name')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('products.f.sku')} htmlFor="pd-sku" required error={e.sku?.message}>
            <Input id="pd-sku" placeholder="PKG-BOX-…" invalid={!!e.sku} {...register('sku')} />
          </Field>
          <Field label={t('products.f.group')} htmlFor="pd-group" required error={groupChoice !== NEW_GROUP ? e.group?.message : undefined}>
            <Select
              id="pd-group"
              value={groupChoice}
              onChange={(ev) => {
                setGroupChoice(ev.target.value);
                setValue('group', ev.target.value === NEW_GROUP ? '' : ev.target.value, { shouldDirty: true });
              }}
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value={NEW_GROUP}>{t('products.f.newGroup')}</option>
            </Select>
          </Field>
        </div>
        {groupChoice === NEW_GROUP && (
          <Field label={t('products.f.newGroupName')} htmlFor="pd-newgroup" required error={e.group?.message}>
            <Input id="pd-newgroup" placeholder={t('products.f.newGroupPlaceholder')} invalid={!!e.group} {...register('group')} />
          </Field>
        )}
        <Field label={t('products.f.spec')} htmlFor="pd-spec" required error={e.spec?.message}>
          <Textarea id="pd-spec" rows={3} placeholder={t('products.f.specPlaceholder')} invalid={!!e.spec} {...register('spec')} />
        </Field>
        <Field label={t('products.f.moq')} htmlFor="pd-moq" required error={e.moq?.message}>
          <div className="flex gap-2">
            <Input id="pd-moq" className="flex-1" type="number" min={1} inputMode="numeric" invalid={!!e.moq} {...register('moq', { valueAsNumber: true })} />
            <Select className="w-28" aria-label={t('products.f.unit')} {...register('unit')}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-label-md text-on-surface">
            {t('products.f.price')} <span className="text-danger">*</span> <span className="font-normal text-on-surface-variant">{t('products.f.priceNote')}</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['priceMin', 'products.f.from', 'products.f.priceFrom', '!pl-11'],
                ['priceMax', 'products.f.to', 'products.f.priceTo', '!pl-12'],
              ] as const
            ).map(([name, prefix, label, pad]) => (
              <Field key={name} error={e[name]?.message}>
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <MoneyInput
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      // Empty stays NaN, as `valueAsNumber` did, so the schema reports it as required.
                      onChange={(v) => field.onChange(v ?? Number.NaN)}
                      onBlur={field.onBlur}
                      prefix={t(prefix)}
                      inputClassName={pad}
                      suffix="đ"
                      aria-label={t(label)}
                      invalid={!!e[name]}
                    />
                  )}
                />
              </Field>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-label-md text-on-surface">
            {t('products.f.leadTime')} <span className="text-danger">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <Field error={e.leadTimeMinDays?.message}>
              <Input type="number" min={1} prefix={t('products.f.from')} inputClassName="!pl-11" suffix={t('common:units.days')} aria-label={t('products.f.leadMin')} invalid={!!e.leadTimeMinDays} {...register('leadTimeMinDays', { valueAsNumber: true })} />
            </Field>
            <Field error={e.leadTimeMaxDays?.message}>
              <Input type="number" min={1} prefix={t('products.f.to')} inputClassName="!pl-12" suffix={t('common:units.days')} aria-label={t('products.f.leadMax')} invalid={!!e.leadTimeMaxDays} {...register('leadTimeMaxDays', { valueAsNumber: true })} />
            </Field>
          </div>
        </fieldset>
        <Controller
          control={control}
          name="certifications"
          render={({ field }) => {
            const has = (opt: string) => field.value.some((c) => matchesCertification(c, opt));
            const toggle = (opt: { value: string; label: string }) =>
              field.onChange(has(opt.value) ? field.value.filter((c) => !matchesCertification(c, opt.value)) : [...field.value, opt.value]);
            return (
              <fieldset>
                <legend className="mb-2 text-label-md text-on-surface">{t('products.f.certifications')}</legend>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CERTIFICATIONS.map((opt) => {
                    const checked = has(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={clsx(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-label-sm transition-colors',
                          checked ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                        )}
                      >
                        <input type="checkbox" className="h-4 w-4 rounded border-outline text-primary focus:ring-primary" checked={checked} onChange={() => toggle(opt)} />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          }}
        />
        <div className="flex flex-col gap-2">
          <span className="text-label-md text-on-surface">{t('products.f.images')}</span>
          <FileDropzone
            accept="image/png,image/jpeg"
            maxSizeMb={10}
            title={t('products.f.imagesTitle')}
            hint={t('products.f.imagesHint')}
            onFiles={(files) => setImages((prev) => [...prev, ...files].slice(0, 5))}
            onError={(m) => toast(t(`common:${m}`), 'error')}
          />
          {images.map((img) => (
            <AttachmentRow key={img.id} file={img} removeLabel={t('common:actions.remove')} onRemove={() => setImages((prev) => prev.filter((x) => x.id !== img.id))} />
          ))}
        </div>
        <div className="border-t border-outline-variant pt-4">
          <Controller
            control={control}
            name="visibleToBuyers"
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label={t('products.f.visibility')} description={t('products.f.visibilityHint')} />}
          />
        </div>
      </form>
    </Drawer>
  );
}
