import clsx from 'clsx';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonClasses, Card, Icon, useToast } from '@/components/ui';
import type { Role } from '@/domain/types';
import { useCurrentUser } from '@/hooks/session';
import { matchesQuery } from './helpSearch';

const SUPPORT_EMAIL = 'support@procura.vn';

const TOPICS = ['sealedBid', 'specs', 'iso'] as const;

const GUIDES: { key: string; icon: string; minutes: number; to: Partial<Record<Role, string>> }[] = [
  { key: 'firstRfq', icon: 'post_add', minutes: 3, to: { buyer: '/buyer/rfqs/new' } },
  { key: 'findSuppliers', icon: 'verified_user', minutes: 4, to: { buyer: '/buyer/suppliers' } },
  { key: 'compare', icon: 'analytics', minutes: 5, to: { buyer: '/buyer/compare' } },
  { key: 'supplierQuote', icon: 'factory', minutes: 3, to: { supplier: '/supplier/inbox' } },
];

const FAQS = ['blindBidding', 'paymentsContracts', 'verifiedSuppliers', 'afterAward', 'editQuote', 'exportExcel'] as const;
type FaqKey = (typeof FAQS)[number];

/** HELP-01 — help centre (both portals). Search filters the guides and FAQ on the client. */
export default function HelpPage() {
  const { t } = useTranslation('help');
  const { role } = useCurrentUser();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<FaqKey>>(() => new Set<FaqKey>(['blindBidding']));

  const guides = GUIDES.filter((g) => matchesQuery(query, t(`guides.items.${g.key}.title`), t(`guides.items.${g.key}.description`)));
  const faqs = FAQS.filter((k) => matchesQuery(query, t(`faq.items.${k}.question`), t(`faq.items.${k}.answer`)));

  const toggleFaq = (key: FaqKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    document.getElementById('help-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('contact.mailSubject'))}`;

  return (
    <>
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-procura-navy p-6 text-center text-on-primary shadow-sm sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-label-sm text-white backdrop-blur-md">
            <Icon name="support_agent" size={15} />
            {t('hero.eyebrow')}
          </span>
          <h1 className="mb-2 text-headline-lg tracking-tight text-white sm:text-display-sm">{t('hero.title')}</h1>
          <p className="mb-6 text-body-lg text-white/80">{t('hero.subtitle')}</p>

          <form role="search" onSubmit={onSearch} className="relative w-full max-w-2xl shadow-md">
            <label htmlFor="help-search" className="sr-only">
              {t('hero.searchLabel')}
            </label>
            <Icon name="search" size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('hero.searchPlaceholder')}
              className="h-12 w-full rounded-lg border border-transparent bg-surface-container-lowest pl-12 pr-28 text-body-md text-on-surface shadow-sm placeholder:text-outline focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tertiary-fixed"
            />
            <button
              type="submit"
              className="absolute bottom-1.5 right-1.5 top-1.5 flex items-center justify-center rounded-md bg-primary px-4 text-label-md text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-procura-accent"
            >
              {t('hero.searchButton')}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-label-sm text-white/70">
            <span>{t('hero.popular')}</span>
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setQuery(t(`hero.topics.${topic}.query`))}
                className="rounded bg-white/15 px-2 py-0.5 text-white transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {t(`hero.topics.${topic}.label`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div id="help-results" className="scroll-mt-20">
        {query.trim() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-body-md text-on-surface-variant" aria-live="polite">
            <span>{t('search.summary', { query: query.trim(), guides: guides.length, faqs: faqs.length })}</span>
            <Button variant="ghost" size="sm" leftIcon="close" onClick={() => setQuery('')}>
              {t('search.clear')}
            </Button>
          </div>
        )}

        {/* Quick guides */}
        <section className="mb-10" aria-labelledby="help-guides">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="help-guides" className="text-headline-md text-on-surface">
                {t('guides.title')}
              </h2>
              <p className="text-body-sm text-on-surface-variant">{t('guides.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => toast(t('common:states.notSupported'), 'info')}
              className="flex items-center gap-1 text-label-md text-primary transition-colors hover:text-tertiary hover:underline"
            >
              {t('guides.viewAll')}
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
          {guides.length === 0 ? (
            <NoResults />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {guides.map((g) => (
                <GuideCard
                  key={g.key}
                  to={g.to[role]}
                  icon={g.icon}
                  title={t(`guides.items.${g.key}.title`)}
                  description={t(`guides.items.${g.key}.description`)}
                  readTime={t('guides.readTime', { count: g.minutes })}
                />
              ))}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mb-10" aria-labelledby="help-faq">
          <div className="mb-4">
            <h2 id="help-faq" className="text-headline-md text-on-surface">
              {t('faq.title')}
            </h2>
            <p className="text-body-sm text-on-surface-variant">{t('faq.subtitle')}</p>
          </div>
          {faqs.length === 0 ? (
            <NoResults />
          ) : (
            <div className="space-y-3">
              {faqs.map((key) => (
                <FaqItem key={key} question={t(`faq.items.${key}.question`)} answer={t(`faq.items.${key}.answer`)} open={open.has(key)} onToggle={() => toggleFaq(key)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Contact */}
      <Card padding="lg" className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Icon name="headset_mic" size={28} />
          </span>
          <div>
            <h2 className="text-headline-sm text-on-surface">{t('contact.title')}</h2>
            <p className="text-body-sm text-on-surface-variant">{t('contact.subtitle')}</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-6 border-t border-surface-container-high pt-4 lg:w-auto lg:justify-end lg:border-t-0 lg:pt-0">
          <div className="flex flex-col text-body-sm lg:items-end">
            <span className="flex items-center gap-1.5 text-on-surface">
              <Icon name="mail" size={16} className="text-outline" />
              <span>
                {t('contact.emailLabel')}{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-on-surface-variant">
              <Icon name="call" size={16} className="text-outline" />
              <span>
                {t('contact.hotlineLabel')} <strong className="font-semibold text-on-surface">{t('contact.hotline')}</strong> {t('contact.hours')}
              </span>
            </span>
          </div>
          <a href={mailto} className={buttonClasses({ size: 'md', className: 'h-10 px-5' })}>
            <Icon name="send" size={18} />
            {t('contact.cta')}
          </a>
        </div>
      </Card>
    </>
  );
}

function NoResults() {
  const { t } = useTranslation('help');
  return <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-center text-body-md text-on-surface-variant">{t('common:states.noResults')}</p>;
}

function GuideCard({ to, icon, title, description, readTime }: { to?: string; icon: string; title: string; description: string; readTime: string }) {
  const body: ReactNode = (
    <>
      <div>
        <span className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary transition-colors group-hover:bg-primary-fixed">
          <Icon name={icon} size={22} />
        </span>
        <h3 className={clsx('mb-2 text-headline-sm text-on-surface', to && 'transition-colors group-hover:text-primary')}>{title}</h3>
        <p className="text-body-sm leading-relaxed text-on-surface-variant">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-surface-container-high pt-4 text-label-sm text-primary">
        <span className="font-semibold">{readTime}</span>
        {to && <Icon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />}
      </div>
    </>
  );
  const classes = 'group flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm';
  if (!to) return <article className={classes}>{body}</article>;
  return (
    <Link
      to={to}
      className={clsx(
        classes,
        'transition-all hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-procura-accent',
      )}
    >
      {body}
    </Link>
  );
}

function FaqItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  const buttonId = `${id}-q`;
  const panelId = `${id}-a`;
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={clsx(
            'flex w-full items-center justify-between gap-3 p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-procura-accent',
            open ? 'bg-surface-container-low' : 'hover:bg-surface-container-low',
          )}
        >
          <span className="flex items-center gap-3">
            <Icon name="help" className={open ? 'text-primary' : 'text-outline'} />
            <span className="text-headline-sm text-on-surface">{question}</span>
          </span>
          <Icon name="keyboard_arrow_down" className={clsx('text-outline transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="border-t border-surface-container-high px-5 pb-5 pt-4">
        <p className="text-body-md leading-relaxed text-on-surface-variant">{answer}</p>
      </div>
    </div>
  );
}
