import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Button, Callout, Checkbox, Field, Icon, Input, Segmented, useToast } from '@/components/ui';
import { clock } from '@/domain/clock';
import type { Role } from '@/domain/types';
import { homePathFor, useSession } from '@/hooks/session';
import { setLanguage } from '@/i18n';
import { loginSchema, redirectAfterLogin, type LoginFormValues } from './loginForm';
import { useDemoAccounts } from './useDemoAccounts';

interface LoginLocationState {
  from?: unknown;
  role?: Role;
}

const BENEFITS = [
  { key: 'sealedBid', icon: 'verified' },
  { key: 'verifiedNetwork', icon: 'domain_verification' },
  { key: 'comparison', icon: 'query_stats' },
] as const;

/** AUTH-01 — sign-in for both portals (no app shell). */
export default function LoginPage() {
  const { t } = useTranslation('auth');
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const state = (location.state ?? null) as LoginLocationState | null;

  const [role, setRole] = useState<Role>(state?.role === 'supplier' ? 'supplier' : 'buyer');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const demo = useDemoAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      const session = await login({ ...values, role });
      const home = homePathFor(session.user.role);
      const target = redirectAfterLogin(home, state?.from);
      navigate(target, { replace: true });
      if (target !== home) {
        // The shared <RedirectIfSignedIn> guard also sends the user to the portal home once the new
        // session reaches the query cache (on the next task); navigate again after it so the page
        // the user originally asked for wins.
        setTimeout(() => navigate(target, { replace: true }), 0);
      }
    } catch (err) {
      setApiError((err as { code?: string } | null)?.code ?? 'errors.generic');
    }
  });

  const changeRole = (next: Role) => {
    setRole(next);
    setApiError(null);
  };

  const applyDemo = (account: { role: Role; email: string; password: string }) => {
    changeRole(account.role);
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    setFocus('email');
  };

  const notSupported = () => toast(t('common:states.notSupported'), 'info');

  return (
    <main className="flex min-h-screen w-full flex-col bg-surface lg:flex-row">
      <BrandPanel />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:p-6 md:p-12">
        <div className="mb-4 flex w-full max-w-md items-center justify-between gap-3 lg:justify-end">
          <div className="flex items-center rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 shadow-sm lg:hidden">
            <Logo className="h-7" />
          </div>
          <LanguageSwitch />
        </div>

        <div className="w-full max-w-md rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm sm:p-9">
          <div className="mb-6">
            <h1 className="mb-1 text-headline-lg text-on-surface">{t('form.title')}</h1>
            <p className="text-body-md text-on-surface-variant">{t('form.subtitle')}</p>
          </div>

          <Segmented<Role>
            ariaLabel={t('form.roleLabel')}
            value={role}
            onChange={changeRole}
            className="mb-6 flex w-full rounded-xl border border-outline-variant/40 bg-surface-container-low [&>button]:min-h-10 [&>button]:rounded-lg [&>button]:py-2"
            options={[
              { value: 'buyer', label: t('form.roleBuyer'), icon: 'shopping_bag' },
              { value: 'supplier', label: t('form.roleSupplier'), icon: 'storefront' },
            ]}
          />

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            {apiError && (
              <Callout tone="danger" title={t('form.errorTitle')}>
                {t(`common:${apiError}`, { defaultValue: t('common:errors.generic') })}
              </Callout>
            )}

            <Field label={t('form.email')} htmlFor="login-email" error={errors.email?.message}>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                leftIcon="alternate_email"
                placeholder={t('form.emailPlaceholder')}
                invalid={Boolean(errors.email)}
                inputClassName="h-10"
                {...register('email')}
              />
            </Field>

            <Field
              label={t('form.password')}
              htmlFor="login-password"
              error={errors.password?.message}
              labelAside={
                <button type="button" onClick={notSupported} className="text-label-sm text-primary hover:text-tertiary hover:underline">
                  {t('form.forgot')}
                </button>
              }
            >
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  leftIcon="lock"
                  placeholder="••••••••"
                  invalid={Boolean(errors.password)}
                  inputClassName="h-10 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('form.hidePassword') : t('form.showPassword')}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-outline transition-colors hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-procura-accent"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </Field>

            <Checkbox className="pt-1" label={<span className="text-body-sm text-on-surface-variant">{t('form.remember')}</span>} {...register('remember')} />

            <Button type="submit" size="lg" fullWidth rightIcon="arrow_forward" loading={isSubmitting} className="mt-2 rounded-xl">
              {t('form.submit')}
            </Button>
          </form>

          <div className="mt-6 border-t border-outline-variant/40 pt-4 text-center">
            <p className="text-body-sm text-on-surface-variant">{t('form.noAccount')}</p>
            <button type="button" onClick={notSupported} className="mt-1 inline-flex items-center gap-1 text-label-md text-primary hover:text-tertiary hover:underline">
              {t('form.register')}
              <Icon name="arrow_forward" size={14} />
            </button>
          </div>

          {demo.data && demo.data.length > 0 && (
            <div className="mt-6 rounded-xl border border-outline-variant/60 bg-surface-container-low/70 p-3.5 text-body-sm text-on-surface-variant">
              <p className="mb-2 flex items-center gap-1.5 text-label-sm font-semibold text-on-surface">
                <Icon name="badge" size={16} className="text-primary" />
                {t('demo.title')}
              </p>
              <ul className="space-y-1.5">
                {demo.data.map((account) => (
                  <li key={`${account.role}-${account.email}`}>
                    <button
                      type="button"
                      onClick={() => applyDemo(account)}
                      title={t('demo.apply')}
                      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/80 p-1.5 text-left transition-colors hover:bg-surface-container-lowest focus-visible:outline focus-visible:outline-2 focus-visible:outline-procura-accent"
                    >
                      <span className="min-w-0 break-all">
                        <span className={clsx('font-semibold', account.role === 'buyer' ? 'text-primary' : 'text-secondary')}>
                          {t(`demo.role.${account.role}`)}
                        </span>{' '}
                        <span className="text-on-surface">{account.email}</span> <span className="text-outline">/ {account.password}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {t('demo.apply')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex w-full max-w-md flex-wrap items-center justify-around gap-2 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Icon name="encrypted" size={16} className="text-outline" />
            {t('trust.tls')}
          </span>
          <span className="text-outline-variant" aria-hidden>
            •
          </span>
          <span className="flex items-center gap-1">
            <Icon name="verified" size={16} className="text-outline" />
            {t('trust.taxCode')}
          </span>
        </div>
      </section>
    </main>
  );
}

function LanguageSwitch() {
  const { t, i18n } = useTranslation('auth');
  const current = (i18n.resolvedLanguage ?? i18n.language) === 'en' ? 'en' : 'vi';
  const options = [
    { value: 'vi', flag: '🇻🇳', label: t('language.vi') },
    { value: 'en', flag: '🇬🇧', label: t('language.en') },
  ] as const;
  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-1.5 text-label-md shadow-sm"
    >
      {options.map((o, i) => (
        <span key={o.value} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-outline-variant" aria-hidden>
              |
            </span>
          )}
          <button
            type="button"
            lang={o.value}
            aria-pressed={current === o.value}
            onClick={() => setLanguage(o.value)}
            className={clsx(
              'flex items-center gap-1 rounded transition-colors',
              current === o.value ? 'font-semibold text-on-surface' : 'text-on-surface-variant hover:text-primary',
            )}
          >
            <span aria-hidden>{o.flag}</span>
            {o.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function BrandPanel() {
  const { t } = useTranslation('auth');
  return (
    <section className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-procura-navy bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px] p-14 text-on-primary lg:flex lg:min-h-screen lg:w-1/2 xl:w-[48%]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-container/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-tertiary-container/25 blur-3xl" aria-hidden />

      <header className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 shadow-sm">
          <Logo />
          <span className="inline-block h-4 w-px bg-outline-variant" aria-hidden />
          <span className="text-headline-sm tracking-tight text-primary">{t('brand.portal')}</span>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-surface-container-lowest/20 bg-surface-container-lowest/10 px-3 py-1 text-label-sm text-on-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          {t('brand.isoBadge')}
        </span>
      </header>

      <div className="relative z-10 my-10 max-w-xl">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-surface-container-lowest/25 bg-surface-container-lowest/15 px-3 py-1 text-label-md text-primary-fixed">
          <Icon name="verified_user" size={16} />
          {t('brand.eyebrow')}
        </span>
        <p className="mb-4 text-display-sm leading-tight tracking-tight text-on-primary">{t('brand.headline')}</p>
        <p className="mb-8 text-body-lg leading-relaxed text-primary-fixed/85">{t('brand.lead')}</p>

        <ul className="space-y-4">
          {BENEFITS.map((b) => (
            <li
              key={b.key}
              className="flex items-start gap-3.5 rounded-xl border border-surface-container-lowest/10 bg-surface-container-lowest/5 p-3.5 backdrop-blur-sm transition-colors hover:bg-surface-container-lowest/10"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-sm">
                <Icon name={b.icon} filled size={18} />
              </span>
              <div>
                <p className="mb-0.5 text-label-lg text-on-primary">{t(`benefits.${b.key}.title`)}</p>
                <p className="text-body-md text-surface-container-high/90">{t(`benefits.${b.key}.description`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <footer className="relative z-10 flex flex-row items-center justify-between gap-3 border-t border-surface-container-lowest/15 pt-6 text-body-sm text-surface-variant">
        <span>{t('brand.copyright', { year: clock.now().getFullYear() })}</span>
        <span className="flex items-center gap-1.5 text-primary-fixed/80">
          <Icon name="lock" size={16} />
          {t('brand.securityNote')}
        </span>
      </footer>
    </section>
  );
}
