import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Icon, KeyValue, LoadingState, PageHeader, Select, Switch, useToast } from '@/components/ui';
import { useSettings, useUpdateSettings } from '@/hooks/account';
import { useCurrentUser } from '@/hooks/session';
import type { UserSettings } from '@/services';
import { isSettingsDirty, NOTIFICATION_KEYS, stageSettings, type NotificationKey } from './settingsDraft';

type SettingsTab = 'profile' | 'notifications' | 'language' | 'security';

const TABS: { id: SettingsTab; icon: string }[] = [
  { id: 'profile', icon: 'person' },
  { id: 'notifications', icon: 'notifications' },
  { id: 'language', icon: 'language' },
  { id: 'security', icon: 'shield' },
];

const LANGUAGES: { value: UserSettings['language']; flag: string }[] = [
  { value: 'vi', flag: '🇻🇳' },
  { value: 'en', flag: '🇬🇧' },
];

const DATE_FORMATS: UserSettings['dateFormat'][] = ['dd/mm/yyyy', 'yyyy-mm-dd'];
const NUMBER_FORMATS: UserSettings['numberFormat'][] = ['vi', 'en'];
const TIMEZONES: UserSettings['timezone'][] = ['Asia/Ho_Chi_Minh'];

const NOTIFICATION_ICONS: Record<NotificationKey, string> = {
  newQuoteEmail: 'mark_email_unread',
  deadlineReminder: 'alarm',
  weeklyDigest: 'newspaper',
};

/** SET-01 — account & system settings (both portals). */
export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const [tab, setTab] = useState<SettingsTab>('language');

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('breadcrumb') }, { label: t(`tabs.${tab}`) }]}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card as="div" padding="none" className="p-2 lg:w-64 lg:shrink-0">
          <nav aria-label={t('navLabel')} className="grid grid-cols-2 gap-1 lg:flex lg:flex-col">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-label-md transition-colors',
                    active ? 'bg-surface-container-high text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  )}
                >
                  <Icon name={item.icon} className={active ? 'text-primary' : undefined} />
                  {t(`tabs.${item.id}`)}
                </button>
              );
            })}
          </nav>
        </Card>

        <div className="min-w-0 flex-1">
          {tab === 'profile' && <ProfilePanel />}
          {(tab === 'language' || tab === 'notifications') && <PreferencesPanel tab={tab} />}
          {tab === 'security' && (
            <Card>
              <EmptyState icon="shield" title={t('tabs.security')} description={t('common:states.notSupported')} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ProfilePanel() {
  const { t } = useTranslation('settings');
  const user = useCurrentUser();
  return (
    <Card padding="lg">
      <CardHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <div className="mb-5 flex items-center gap-4">
        <Avatar initials={user.initials} size="xl" />
        <div className="min-w-0">
          <p className="text-headline-md text-on-surface">{user.name}</p>
          <p className="text-body-md text-on-surface-variant">{user.title}</p>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <KeyValue label={t('profile.name')} value={user.name} />
        <KeyValue label={t('profile.jobTitle')} value={user.title} />
        <KeyValue
          label={t('profile.email')}
          value={
            <a href={`mailto:${user.email}`} className="break-all text-primary hover:underline">
              {user.email}
            </a>
          }
        />
        <KeyValue label={t('profile.phone')} value={user.phone ?? '—'} />
        <KeyValue label={t('profile.role')} value={t(`profile.roles.${user.role}`)} />
      </dl>
    </Card>
  );
}

/** Language & formats (+ notification preview) and the notifications tab share one staged draft. */
function PreferencesPanel({ tab }: { tab: 'language' | 'notifications' }) {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const settings = useSettings();
  const update = useUpdateSettings();
  const [draft, setDraft] = useState<UserSettings | null>(null);

  if (settings.isLoading) {
    return (
      <Card>
        <LoadingState rows={5} />
      </Card>
    );
  }
  if (settings.isError || !settings.data) {
    return (
      <Card>
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      </Card>
    );
  }

  const saved = settings.data;
  const value = draft ?? saved;
  const dirty = isSettingsDirty(draft, saved);
  const patch = (p: Partial<UserSettings>) => setDraft(stageSettings(draft, saved, p));
  const toggle = (key: NotificationKey, on: boolean) => patch({ notifications: { ...value.notifications, [key]: on } });

  const save = () => {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => {
        setDraft(null);
        toast(t('common:toast.saved'));
      },
      onError: (err) => {
        const code = (err as { code?: string }).code ?? 'errors.generic';
        toast(t(`common:${code}`, { defaultValue: t('common:errors.generic') }), 'error');
      },
    });
  };

  return (
    <Card as="div" padding="none" className="divide-y divide-outline-variant">
      {tab === 'language' && (
        <>
          <section className="p-6" aria-labelledby="settings-language">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="settings-language" className="text-headline-sm text-on-surface">
                  {t('language.title')}
                </h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('language.subtitle')}</p>
              </div>
              <Badge tone={dirty ? 'warning' : 'neutral'} className="rounded-full">
                {dirty ? t('status.unsaved') : t('status.saved')}
              </Badge>
            </div>
            <div role="radiogroup" aria-labelledby="settings-language" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {LANGUAGES.map((lang) => {
                const checked = value.language === lang.value;
                return (
                  <label
                    key={lang.value}
                    className={clsx(
                      'relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-colors',
                      checked ? 'border-primary bg-primary-fixed/20 shadow-sm ring-1 ring-primary' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low',
                    )}
                  >
                    <input
                      type="radio"
                      name="settings-language"
                      value={lang.value}
                      checked={checked}
                      onChange={() => patch({ language: lang.value })}
                      className="mt-0.5 h-4 w-4 shrink-0 border-outline text-primary focus:ring-primary"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[18px]" aria-hidden>
                          {lang.flag}
                        </span>
                        <span lang={lang.value} className="text-label-lg text-on-surface">
                          {t(`language.options.${lang.value}.name`)}
                        </span>
                        {saved.language === lang.value && (
                          <span className="whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary">
                            {t('language.inUse')}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{t(`language.options.${lang.value}.description`)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="p-6" aria-labelledby="settings-formats">
            <div className="mb-4">
              <h2 id="settings-formats" className="text-headline-sm text-on-surface">
                {t('formats.title')}
              </h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('formats.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Field label={t('formats.date.label')} htmlFor="settings-date-format" hint={t('formats.date.hint')}>
                <Select
                  id="settings-date-format"
                  value={value.dateFormat}
                  onChange={(e) => patch({ dateFormat: e.target.value as UserSettings['dateFormat'] })}
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {t(`formats.date.options.${f === 'dd/mm/yyyy' ? 'dmy' : 'ymd'}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('formats.number.label')} htmlFor="settings-number-format" hint={t('formats.number.hint')}>
                <Select
                  id="settings-number-format"
                  value={value.numberFormat}
                  onChange={(e) => patch({ numberFormat: e.target.value as UserSettings['numberFormat'] })}
                >
                  {NUMBER_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {t(`formats.number.options.${f}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('formats.timezone.label')} htmlFor="settings-timezone" hint={t('formats.timezone.hint')}>
                <Select
                  id="settings-timezone"
                  value={value.timezone}
                  onChange={(e) => patch({ timezone: e.target.value as UserSettings['timezone'] })}
                >
                  {TIMEZONES.map((z) => (
                    <option key={z} value={z}>
                      {t('formats.timezone.options.hcm')}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>
        </>
      )}

      <section className="p-6" aria-labelledby="settings-notifications">
        <div className="mb-4">
          <h2 id="settings-notifications" className="text-headline-sm text-on-surface">
            {tab === 'language' ? t('notifications.previewTitle') : t('notifications.title')}
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('notifications.subtitle')}</p>
        </div>
        <div className="space-y-3.5">
          {NOTIFICATION_KEYS.map((key) => {
            const on = value.notifications[key];
            return (
              <div
                key={key}
                className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low/50 p-3.5 transition-colors hover:bg-surface-container-low"
              >
                <Icon name={NOTIFICATION_ICONS[key]} className={clsx('mt-0.5', on ? 'text-primary' : 'text-outline')} />
                <Switch
                  className="min-w-0 flex-1 items-center [&_label>span:first-child]:text-label-md"
                  checked={on}
                  onChange={(next) => toggle(key, next)}
                  label={t(`notifications.items.${key}.title`)}
                  description={t(`notifications.items.${key}.description`)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-b-xl bg-surface-container-low/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" size={16} className="mt-px text-outline" />
          {t('footer.note')}
        </p>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setDraft(null)} disabled={!dirty || update.isPending}>
            {t('footer.discard')}
          </Button>
          <Button leftIcon="check" onClick={save} disabled={!dirty} loading={update.isPending}>
            {t('common:actions.saveChanges')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
