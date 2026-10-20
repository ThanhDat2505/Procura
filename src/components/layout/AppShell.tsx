import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Avatar, ButtonLink, Icon, IconButton, MenuItem, Popover } from '@/components/ui';
import type { Role } from '@/domain/types';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/account';
import { useRfqList, useSavedSuppliers } from '@/hooks/buyer';
import { useCurrentUser, useSession } from '@/hooks/session';
import { useInbox, useMyQuotations, useSupplierProfile } from '@/hooks/supplierPortal';
import { useFormat } from '@/hooks/useFormat';
import { setLanguage } from '@/i18n';
import { NAV, type NavItem } from './navigation';

/** Sidebar badge counts, loaded lazily per role. */
function useBuyerBadges(enabled: boolean) {
  const rfqs = useRfqList({ tab: 'all', page: 1, pageSize: 1 });
  const saved = useSavedSuppliers();
  return enabled ? { rfqs: rfqs.data ? rfqs.data.counts.open + rfqs.data.counts.awaiting + rfqs.data.counts.quoted : undefined, saved: saved.data?.items.length } : {};
}

function useSupplierBadges() {
  const inbox = useInbox({ tab: 'new', sort: 'deadline' });
  const quotes = useMyQuotations({ tab: 'pending', page: 1, pageSize: 1 });
  return { inbox: inbox.data?.counts.new, quotations: quotes.data?.counts.pending };
}

function NavRow({ item, badge, onNavigate }: { item: NavItem; badge?: number; onNavigate?: () => void }) {
  const { t } = useTranslation('layout');
  const { pathname } = useLocation();
  const custom = item.isActive?.(pathname);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors duration-150 active:scale-[0.99]',
          (custom ?? isActive) ? 'bg-surface-container-high font-semibold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
        )
      }
    >
      {({ isActive: routeActive }) => {
        const isActive = custom ?? routeActive;
        return (
        <>
          <Icon name={item.icon} filled={isActive} className={isActive ? 'text-primary' : undefined} />
          <span className="flex-1 truncate">{t(item.labelKey)}</span>
          {badge !== undefined && badge > 0 && <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm font-bold tabular-nums text-on-primary-fixed">{badge}</span>}
        </>
        );
      }}
    </NavLink>
  );
}

function BuyerSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('layout');
  const badges = useBuyerBadges(true);
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-1">
        <Logo />
        <div className="flex flex-col">
          <span className="text-headline-sm font-bold leading-none tracking-tight text-primary">Procura Sourcing</span>
          <span className="mt-1 text-label-sm font-medium text-on-surface-variant">{t('buyerPortal')}</span>
        </div>
      </div>
      <ButtonLink to="/buyer/rfqs/new" leftIcon="add" fullWidth onClick={onNavigate}>
        {t('common:actions.createRfq')}
      </ButtonLink>
      <nav className="mt-1 flex flex-col gap-1" aria-label={t('mainNav')}>
        {NAV.buyer.main.map((item) => (
          <NavRow key={item.to} item={item} badge={item.badge ? badges[item.badge as 'rfqs' | 'saved'] : undefined} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

function SupplierSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('layout');
  const badges = useSupplierBadges();
  const profile = useSupplierProfile();
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-1">
        <Logo className="h-7" />
        <div className="border-l border-outline-variant pl-2.5">
          <p className="text-label-sm uppercase tracking-wide text-primary">Supplier Portal</p>
        </div>
      </div>
      {profile.data && (
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3">
          <Avatar initials={profile.data.initials} square tone="primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md text-on-surface">{profile.data.shortName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-label-sm text-tertiary">
              <Icon name="verified" filled size={14} />
              {t('verifiedPartner')}
            </p>
          </div>
        </div>
      )}
      <nav className="mt-2 flex flex-col gap-1" aria-label={t('mainNav')}>
        {NAV.supplier.main.map((item) => (
          <NavRow key={item.to} item={item} badge={item.badge ? badges[item.badge as 'inbox' | 'quotations'] : undefined} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const user = useCurrentUser();
  const { t } = useTranslation('layout');
  return (
    <div className="flex h-full flex-col justify-between gap-4 p-4">
      <div className="flex flex-col gap-4">{role === 'buyer' ? <BuyerSidebarBody onNavigate={onNavigate} /> : <SupplierSidebarBody onNavigate={onNavigate} />}</div>
      <div className="flex flex-col gap-2 border-t border-outline-variant/60 pt-3">
        <nav className="flex flex-col gap-1" aria-label={t('secondaryNav')}>
          {NAV[role].footer.map((item) => (
            <NavRow key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </nav>
        <div className="mt-1 flex items-center gap-2.5 rounded-lg bg-surface-container-low px-2 py-2">
          <Avatar initials={user.initials} size="sm" tone={role === 'buyer' ? 'primary' : 'neutral'} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-label-md text-on-surface">{user.name}</span>
            <span className="truncate text-[11px] text-on-surface-variant">{user.title}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const { t } = useTranslation('layout');
  const f = useFormat();
  const navigate = useNavigate();
  const { data = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const unread = data.filter((n) => !n.read).length;
  const items = (tab === 'unread' ? data.filter((n) => !n.read) : data).slice(0, 8);
  const icons: Record<string, string> = { quote_received: 'request_quote', deadline: 'schedule', rfq_viewed: 'visibility', rfq_received: 'inbox', awarded: 'emoji_events', not_selected: 'cancel' };
  return (
    <Popover
      className="w-[min(92vw,380px)]"
      trigger={({ toggle, open, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          aria-label={t('notifications.title')}
          className="relative rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <Icon name="notifications" />
          {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">{unread}</span>}
        </button>
      )}
    >
      {(close) => (
        <div role="menu">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <p className="text-headline-sm">{t('notifications.title')}</p>
            <button type="button" className="text-label-md text-primary hover:underline disabled:opacity-50" disabled={unread === 0} onClick={() => markAll.mutate()}>
              {t('notifications.markAll')}
            </button>
          </div>
          <div className="flex gap-1 px-4 pt-2">
            {(['all', 'unread'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={clsx('rounded-md px-2.5 py-1 text-label-md', tab === k ? 'bg-primary-fixed text-primary' : 'text-on-surface-variant hover:bg-surface-container-low')}
              >
                {k === 'all' ? t('notifications.all') : t('notifications.unread', { count: unread })}
              </button>
            ))}
          </div>
          <ul className="max-h-96 overflow-y-auto py-2">
            {items.length === 0 && <li className="px-4 py-6 text-center text-body-md text-on-surface-variant">{t('notifications.empty')}</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-surface-container-low"
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id);
                    close();
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span className={clsx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-fixed text-primary')}>
                    <Icon name={icons[n.kind] ?? 'notifications'} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-body-md', n.read ? 'text-on-surface-variant' : 'font-semibold text-on-surface')}>{n.title}</span>
                    <span className="block truncate text-body-sm text-on-surface-variant">{n.body}</span>
                    <span className="block text-body-sm text-outline">{f.relative(n.at)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function UserMenu({ role }: { role: Role }) {
  const { t, i18n } = useTranslation('layout');
  const user = useCurrentUser();
  const { logout } = useSession();
  const navigate = useNavigate();
  return (
    <Popover
      className="w-64 py-1"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 hover:bg-surface-container-low">
          <Avatar initials={user.initials} size="sm" tone="solid" />
          <span className="hidden flex-col text-left leading-tight md:flex">
            <span className="text-label-md text-on-surface">{user.name}</span>
            <span className="text-[11px] text-on-surface-variant">{user.title}</span>
          </span>
          <Icon name="expand_more" size={18} className="text-outline" />
        </button>
      )}
    >
      {(close) => (
        <div role="menu">
          <div className="border-b border-outline-variant px-3 py-2.5">
            <p className="text-label-lg text-on-surface">{user.name}</p>
            <p className="text-body-sm text-on-surface-variant">{user.email}</p>
          </div>
          <MenuItem
            icon="settings"
            onClick={() => {
              close();
              navigate(`/${role}/settings`);
            }}
          >
            {t('nav.settings')}
          </MenuItem>
          <MenuItem icon="translate" onClick={() => setLanguage(i18n.language === 'vi' ? 'en' : 'vi')}>
            {t('userMenu.language')}: {i18n.language === 'vi' ? 'Tiếng Việt' : 'English'}
          </MenuItem>
          <div className="my-1 border-t border-outline-variant" />
          <MenuItem
            icon="logout"
            tone="danger"
            onClick={async () => {
              close();
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            {t('userMenu.logout')}
          </MenuItem>
        </div>
      )}
    </Popover>
  );
}

function Topbar({ role, onMenu }: { role: Role; onMenu: () => void }) {
  const { t } = useTranslation('layout');
  const profile = useSupplierProfileSafe(role);
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 shadow-sm sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <IconButton icon="menu" label={t('openMenu')} className="lg:hidden" onClick={onMenu} />
        <Link to={role === 'buyer' ? '/buyer' : '/supplier'} className="lg:hidden">
          <Logo className="h-7" />
        </Link>
        <div className="relative hidden w-full max-w-sm md:block">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="search"
            className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-9 pr-3 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            placeholder={t(role === 'buyer' ? 'searchBuyer' : 'searchSupplier')}
            aria-label={t('common:actions.search')}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {role === 'buyer' ? (
          <ButtonLink to="/buyer/rfqs/new" leftIcon="add" size="sm" className="hidden sm:inline-flex">
            {t('common:actions.createRfq')}
          </ButtonLink>
        ) : (
          profile && (
            <span className="hidden items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 sm:flex">
              <Icon name="domain" size={18} className="text-primary" />
              <span className="text-label-md text-on-surface">{profile}</span>
            </span>
          )
        )}
        <div className="hidden h-5 w-px bg-outline-variant sm:block" />
        <NotificationsMenu />
        <Link to={`/${role}/help`} className="hidden rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface sm:block" aria-label={t('nav.help')}>
          <Icon name="help" />
        </Link>
        <div className="hidden h-5 w-px bg-outline-variant sm:block" />
        <UserMenu role={role} />
      </div>
    </header>
  );
}

function useSupplierProfileSafe(role: Role): string | undefined {
  const profile = useSupplierProfile(role === 'supplier');
  return role === 'supplier' ? profile.data?.shortName : undefined;
}

/** Shared shell: 256px sidebar on desktop, off-canvas drawer below 1024px (DESIGN.md responsive rules). */
export function AppShell({ role }: { role: Role }) {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const { t } = useTranslation('layout');
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-full bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        {t('skipToContent')}
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-outline-variant bg-surface-container-lowest shadow-sm lg:block">
        <Sidebar role={role} />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('mainNav')}>
          <div className="absolute inset-0 bg-procura-navy/30" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface-container-lowest shadow-level-4">
            <div className="absolute right-2 top-2">
              <IconButton icon="close" label={t('closeMenu')} onClick={() => setDrawer(false)} />
            </div>
            <Sidebar role={role} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
        <Topbar role={role} onMenu={() => setDrawer(true)} />
        <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
