import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Card, CardHeader, ConfirmDialog, Field, Icon, Input, Modal, Select, Switch, Table, Td, Textarea, Th, THead, Tr, useToast } from '@/components/ui';
import type { Supplier, SupplierContact } from '@/domain/types';
import { useDeleteContact, useSaveContact, useUpdateProfile } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { ProfileGate, RowActions, useErrorToast } from './components';
import { useRegisterProfileSave } from './ProfileSaveContext';
import { primaryContact, toContactInput } from './profileHelpers';
import { contactSchema, type ContactFormValues } from './profileSchemas';

/** SLA options: the stored value is data (Vietnamese), the label is translated. */
const SLA_OPTIONS = [
  { value: '< 2 giờ', key: 'h2' },
  { value: '< 4 giờ', key: 'h4' },
  { value: '< 8 giờ', key: 'h8' },
  { value: '< 24 giờ', key: 'h24' },
];

/** SUP-05e — Liên hệ kinh doanh. */
export default function ContactsTab() {
  return <ProfileGate>{(supplier) => <ContactsContent supplier={supplier} />}</ProfileGate>;
}

function ContactsContent({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation('profile');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const saveContact = useSaveContact();
  const removeContact = useDeleteContact();
  const update = useUpdateProfile();
  const primary = primaryContact(supplier.contacts);

  const [editing, setEditing] = useState<SupplierContact | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SupplierContact | null>(null);

  // Profile-level settings saved through the layout's "Lưu thay đổi".
  const initial = { workingHours: supplier.workingHours, responseSla: supplier.responseSla, website: supplier.website ?? '' };
  const [settings, setSettings] = useState(initial);
  // Presentation-only settings (not in the data model yet): kept for this session.
  const [autoReply, setAutoReply] = useState(true);
  const [autoReplyText, setAutoReplyText] = useState(() => {
    const slaKey = SLA_OPTIONS.find((o) => o.value === supplier.responseSla)?.key;
    const sla = slaKey ? t(`contacts.slaOptions.${slaKey}`) : supplier.responseSla;
    return t('contacts.autoReplyDefault', { name: supplier.shortName, sla: sla.replace(/^<\s*/, '') });
  });
  const [channels, setChannels] = useState({ email: true, phone: true, website: Boolean(supplier.website) });

  const dirty = settings.workingHours !== initial.workingHours || settings.responseSla !== initial.responseSla || settings.website.trim() !== initial.website;
  const workingHoursError = settings.workingHours.trim() ? undefined : 'validation.required';

  const saveSettings = async () => {
    if (workingHoursError) return;
    try {
      await update.mutateAsync({ workingHours: settings.workingHours.trim(), responseSla: settings.responseSla, website: settings.website.trim() || undefined });
      toast(t('common:toast.saved'));
    } catch (err) {
      showError(err);
    }
  };
  useRegisterProfileSave({ save: saveSettings, dirty, saving: update.isPending });

  const toggleNotify = async (c: SupplierContact, notifyNewRfq: boolean) => {
    try {
      await saveContact.mutateAsync({ ...toContactInput(c), notifyNewRfq });
      toast(notifyNewRfq ? t('contacts.notifyOn', { name: c.name }) : t('contacts.notifyOff', { name: c.name }));
    } catch (err) {
      showError(err);
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await removeContact.mutateAsync(deleting.id);
      toast(t('contacts.deleted', { name: deleting.name }));
      setDeleting(null);
    } catch (err) {
      showError(err);
      setDeleting(null);
    }
  };

  const slaOptions = SLA_OPTIONS.some((o) => o.value === settings.responseSla) ? SLA_OPTIONS : [...SLA_OPTIONS, { value: settings.responseSla, key: '' }];

  return (
    <div className="flex flex-col gap-6 pb-2">
      {primary && (
        <Card padding="lg">
          <CardHeader
            icon="badge"
            title={t('contacts.primaryTitle')}
            subtitle={t('contacts.primarySubtitle')}
            actions={
              <Button variant="secondary" size="sm" leftIcon="edit" onClick={() => setEditing(primary)}>
                {t('contacts.editInfo')}
              </Button>
            }
          />
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-fixed text-headline-lg text-primary shadow-sm" aria-hidden>
                {primary.initials}
              </span>
              {primary.visibleToBuyers && (
                <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-label-sm text-tertiary">
                  <Icon name="check_circle" filled size={12} />
                  {t('contacts.visibleToBuyers')}
                </span>
              )}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <div>
                <p className="text-headline-md text-on-surface">{primary.name}</p>
                <p className="mt-0.5 text-body-md text-on-surface-variant">{primary.title}</p>
              </div>
              <dl className="space-y-2 text-body-md">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="mail" size={18} className="text-outline" />
                  <dt className="font-medium text-on-surface-variant">{t('contacts.email')}:</dt>
                  <dd>
                    <a href={`mailto:${primary.email}`} className="font-semibold text-primary hover:underline">
                      {primary.email}
                    </a>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="call" size={18} className="text-outline" />
                  <dt className="font-medium text-on-surface-variant">{t('contacts.phone')}:</dt>
                  <dd className="font-semibold tabular-nums text-on-surface">{primary.phone}</dd>
                </div>
              </dl>
              <div className="border-t border-outline-variant pt-2 md:col-span-2">
                <p className="text-label-md text-on-surface">{t('contacts.scope')}</p>
                <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">{primary.responsibility || t('common:labels.none')}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-5">
          <div>
            <h2 className="flex items-center gap-2 text-headline-sm text-on-surface">
              <Icon name="group" className="text-primary" />
              {t('contacts.teamTitle')}
            </h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('contacts.teamSubtitle')}</p>
          </div>
          <Button leftIcon="add" onClick={() => setEditing('new')}>
            {t('contacts.add')}
          </Button>
        </div>
        <Table minWidth={940}>
          <THead>
            <tr>
              <Th>{t('contacts.col.name')}</Th>
              <Th>{t('contacts.col.title')}</Th>
              <Th>{t('contacts.col.email')}</Th>
              <Th className="!whitespace-normal">{t('contacts.col.phone')}</Th>
              <Th className="!whitespace-normal">{t('contacts.col.scope')}</Th>
              <Th className="w-28 !whitespace-normal text-center">{t('contacts.col.notify')}</Th>
              <Th className="text-right">{t('common:labels.actions')}</Th>
            </tr>
          </THead>
          <tbody>
            {supplier.contacts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="flex min-w-[130px] items-center gap-2 font-semibold text-on-surface">
                    <Avatar initials={c.initials} size="sm" tone={c.isPrimary ? 'primary' : 'neutral'} />
                    {c.name}
                  </span>
                </Td>
                <Td className="min-w-[128px] text-on-surface-variant">{c.title}</Td>
                <Td className="whitespace-nowrap font-medium text-primary">{c.email}</Td>
                <Td className="whitespace-nowrap">{c.phone}</Td>
                <Td>
                  {c.responsibility && <span className="inline-block min-w-[130px] max-w-[180px] rounded bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface">{c.responsibility}</span>}
                </Td>
                <Td className="relative text-center">
                  <label htmlFor={`notify-${c.id}`} className="sr-only">
                    {t('contacts.notifyFor', { name: c.name })}
                  </label>
                  <Switch id={`notify-${c.id}`} checked={c.notifyNewRfq} onChange={(v) => void toggleNotify(c, v)} disabled={saveContact.isPending} />
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <RowActions name={c.name} separator="/" onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card padding="lg">
        <CardHeader icon="schedule" title={t('contacts.hoursTitle')} subtitle={t('contacts.hoursSubtitle')} />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label={t('contacts.workingHours')} htmlFor="ct-hours" required error={workingHoursError}>
              <Input
                id="ct-hours"
                leftIcon="calendar_month"
                value={settings.workingHours}
                invalid={!!workingHoursError}
                onChange={(e) => setSettings((s) => ({ ...s, workingHours: e.target.value }))}
              />
            </Field>
            <Field label={t('contacts.sla')} htmlFor="ct-sla" hint={t('contacts.slaHint')}>
              <Select id="ct-sla" value={settings.responseSla} onChange={(e) => setSettings((s) => ({ ...s, responseSla: e.target.value }))}>
                {slaOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.key ? t(`contacts.slaOptions.${o.key}`) : o.value}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3.5">
              <span className="text-label-sm text-on-surface-variant">{t('contacts.avgResponse')}</span>
              <p className="mt-1 text-headline-md tabular-nums text-primary">{t('contacts.hoursValue', { value: f.number(supplier.avgResponseHours, 1) })}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <Switch checked={autoReply} onChange={setAutoReply} label={t('contacts.autoReply')} description={t('contacts.autoReplyHint')} />
            <Field label={t('contacts.autoReplyMessage')} htmlFor="ct-auto">
              <Textarea id="ct-auto" rows={4} value={autoReplyText} disabled={!autoReply} onChange={(e) => setAutoReplyText(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader icon="hub" title={t('contacts.channelsTitle')} subtitle={t('contacts.channelsSubtitle')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChannelTile icon="mark_email_read" on={channels.email} onChange={(v) => setChannels((c) => ({ ...c, email: v }))} label={t('contacts.channel.email')} detail={primary?.email} />
          <ChannelTile icon="ring_volume" on={channels.phone} onChange={(v) => setChannels((c) => ({ ...c, phone: v }))} label={t('contacts.channel.phone')} detail={primary?.phone} />
          <div className="md:col-span-2">
            <ChannelTile icon="language" on={channels.website} onChange={(v) => setChannels((c) => ({ ...c, website: v }))} label={t('contacts.channel.website')}>
              <Input
                className="mt-2 max-w-md"
                aria-label={t('general.website')}
                placeholder="example.vn"
                value={settings.website}
                disabled={!channels.website}
                onChange={(e) => setSettings((s) => ({ ...s, website: e.target.value }))}
              />
            </ChannelTile>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest/95 px-4 py-3 shadow-level-3 backdrop-blur sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" size={18} className="text-primary" />
          {t('contacts.syncNote')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={!dirty || update.isPending} onClick={() => setSettings(initial)}>
            {t('common:actions.cancelChanges')}
          </Button>
          <Button leftIcon="check" disabled={!dirty} loading={update.isPending} onClick={() => void saveSettings()}>
            {t('common:actions.saveChanges')}
          </Button>
        </div>
      </div>

      <ContactModal key={editing === 'new' ? 'new' : (editing?.id ?? 'none')} contact={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t('contacts.deleteTitle')}
        description={deleting?.isPrimary ? t('contacts.deletePrimaryBody') : t('contacts.deleteBody', { name: deleting?.name ?? '' })}
        confirmLabel={t('common:actions.delete')}
        tone="danger"
        loading={removeContact.isPending}
      />
    </div>
  );
}

function ChannelTile({ icon, label, detail, on, onChange, children }: { icon: string; label: string; detail?: string; on: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon name={icon} className={on ? 'mt-0.5 text-primary' : 'mt-0.5 text-outline'} />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="cursor-pointer text-label-md text-on-surface">
            {label}
          </label>
          {detail && <p className="mt-0.5 text-body-sm tabular-nums text-on-surface-variant">{detail}</p>}
          {children}
        </div>
      </div>
      <Switch id={id} checked={on} onChange={onChange} />
    </div>
  );
}

function ContactModal({ contact, onClose }: { contact: SupplierContact | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation('profile');
  const toast = useToast();
  const showError = useErrorToast();
  const save = useSaveContact();
  const formId = useId();
  const existing = contact && contact !== 'new' ? contact : null;
  const { register, handleSubmit, formState, control } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          title: existing.title,
          email: existing.email,
          phone: existing.phone,
          responsibility: existing.responsibility,
          notifyNewRfq: existing.notifyNewRfq,
          isPrimary: existing.isPrimary,
          visibleToBuyers: existing.visibleToBuyers,
        }
      : { name: '', title: '', email: '', phone: '', responsibility: '', notifyNewRfq: true, isPrimary: false, visibleToBuyers: false },
  });
  const e = formState.errors;
  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(existing ? { ...v, id: existing.id } : v);
      toast(existing ? t('contacts.updated', { name: v.name }) : t('contacts.added', { name: v.name }));
      onClose();
    } catch (err) {
      showError(err);
    }
  });
  return (
    <Modal
      open={contact !== null}
      onClose={onClose}
      size="lg"
      title={existing ? t('contacts.editTitle') : t('contacts.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            {existing ? t('common:actions.saveChanges') : t('contacts.add')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('contacts.col.name')} htmlFor="cm-name" required error={e.name?.message}>
          <Input id="cm-name" autoComplete="name" invalid={!!e.name} {...register('name')} />
        </Field>
        <Field label={t('contacts.col.title')} htmlFor="cm-title" required error={e.title?.message}>
          <Input id="cm-title" invalid={!!e.title} {...register('title')} />
        </Field>
        <Field label={t('contacts.col.email')} htmlFor="cm-email" required error={e.email?.message}>
          <Input id="cm-email" type="email" autoComplete="email" invalid={!!e.email} {...register('email')} />
        </Field>
        <Field label={t('contacts.col.phone')} htmlFor="cm-phone" required error={e.phone?.message}>
          <Input id="cm-phone" type="tel" autoComplete="tel" placeholder="0918.425.888" invalid={!!e.phone} {...register('phone')} />
        </Field>
        <Field label={t('contacts.col.scope')} htmlFor="cm-scope" error={e.responsibility?.message} className="sm:col-span-2">
          <Input id="cm-scope" placeholder={t('contacts.scopePlaceholder')} {...register('responsibility')} />
        </Field>
        <div className="flex flex-col gap-3 border-t border-outline-variant pt-4 sm:col-span-2">
          <Controller control={control} name="notifyNewRfq" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label={t('contacts.col.notify')} description={t('contacts.notifyHint')} />} />
          <Controller
            control={control}
            name="visibleToBuyers"
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label={t('contacts.visibleToBuyers')} description={t('contacts.visibleHint')} />}
          />
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} disabled={existing?.isPrimary} label={t('contacts.isPrimary')} description={t('contacts.isPrimaryHint')} />
            )}
          />
        </div>
      </form>
    </Modal>
  );
}
