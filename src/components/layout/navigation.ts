import type { Role } from '@/domain/types';

export interface NavItem {
  /** i18n key in the `layout` namespace. */
  labelKey: string;
  to: string;
  icon: string;
  end?: boolean;
  /** Which sidebar badge to show next to the item. */
  badge?: 'rfqs' | 'saved' | 'inbox' | 'quotations';
  /** Custom active rule; defaults to router prefix matching. */
  isActive?: (pathname: string) => boolean;
}

export const NAV: Record<Role, { main: NavItem[]; footer: NavItem[] }> = {
  buyer: {
    main: [
      { labelKey: 'nav.dashboard', to: '/buyer', icon: 'dashboard', end: true },
      { labelKey: 'nav.findSuppliers', to: '/buyer/suppliers', icon: 'storefront' },
      { labelKey: 'nav.rfqs', to: '/buyer/rfqs', icon: 'request_quote', badge: 'rfqs', isActive: (p) => p.startsWith('/buyer/rfqs') && !p.endsWith('/compare') },
      { labelKey: 'nav.saved', to: '/buyer/saved', icon: 'bookmark', badge: 'saved' },
      { labelKey: 'nav.compare', to: '/buyer/compare', icon: 'compare_arrows', isActive: (p) => p.startsWith('/buyer/compare') || p.endsWith('/compare') },
    ],
    footer: [
      { labelKey: 'nav.settings', to: '/buyer/settings', icon: 'settings' },
      { labelKey: 'nav.help', to: '/buyer/help', icon: 'help' },
    ],
  },
  supplier: {
    main: [
      { labelKey: 'nav.inbox', to: '/supplier/inbox', icon: 'inbox', badge: 'inbox' },
      { labelKey: 'nav.quotations', to: '/supplier/quotations', icon: 'send', badge: 'quotations' },
      { labelKey: 'nav.profile', to: '/supplier/profile', icon: 'badge' },
      { labelKey: 'nav.performance', to: '/supplier/performance', icon: 'trending_up' },
    ],
    footer: [
      { labelKey: 'nav.settings', to: '/supplier/settings', icon: 'settings' },
      { labelKey: 'nav.helpSupplier', to: '/supplier/help', icon: 'help' },
    ],
  },
};
