import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui';
import { RedirectIfSignedIn, RequireRole, RootRedirect } from './guards';
import { NotFoundPage } from './NotFoundPage';

/** Lazy-load each screen so the two portals ship as separate chunks. */
function page(load: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(load);
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/login',
    element: <RedirectIfSignedIn>{page(() => import('@/features/auth/LoginPage'))}</RedirectIfSignedIn>,
  },
  {
    path: '/buyer',
    element: (
      <RequireRole role="buyer">
        <AppShell role="buyer" />
      </RequireRole>
    ),
    children: [
      { index: true, element: page(() => import('@/features/buyer/dashboard/BuyerDashboardPage')) }, // BUY-01
      { path: 'suppliers', element: page(() => import('@/features/buyer/suppliers/SupplierDiscoveryPage')) }, // BUY-02
      {
        path: 'suppliers/:supplierId',
        element: page(() => import('@/features/buyer/supplier-detail/SupplierDetailLayout')),
        children: [
          { index: true, element: page(() => import('@/features/buyer/supplier-detail/OverviewTab')) }, // BUY-03
          { path: 'products', element: page(() => import('@/features/buyer/supplier-detail/ProductsTab')) }, // BUY-03b
          { path: 'history', element: page(() => import('@/features/buyer/supplier-detail/HistoryTab')) }, // BUY-03c
          { path: 'legal', element: page(() => import('@/features/buyer/supplier-detail/LegalTab')) }, // BUY-03d
          { path: 'reviews', element: page(() => import('@/features/buyer/supplier-detail/ReviewsTab')) }, // BUY-03e
        ],
      },
      { path: 'saved', element: page(() => import('@/features/buyer/saved/SavedSuppliersPage')) }, // BUY-04
      { path: 'rfqs', element: page(() => import('@/features/buyer/rfqs/RfqListPage')) }, // BUY-05
      { path: 'rfqs/new', element: page(() => import('@/features/buyer/rfq-wizard/NewRfqPage')) },
      { path: 'rfqs/:rfqId/edit/:step', element: page(() => import('@/features/buyer/rfq-wizard/RfqWizardPage')) }, // BUY-06 → 06d
      { path: 'rfqs/:rfqId/sent', element: page(() => import('@/features/buyer/rfq-wizard/RfqSentPage')) }, // BUY-06e
      { path: 'rfqs/:rfqId', element: page(() => import('@/features/buyer/rfq-detail/RfqDetailPage')) }, // BUY-07
      { path: 'rfqs/:rfqId/compare', element: page(() => import('@/features/buyer/comparison/ComparisonPage')) }, // BUY-08
      { path: 'compare', element: page(() => import('@/features/buyer/compare-list/CompareOverviewPage')) }, // BUY-09
      { path: 'settings', element: page(() => import('@/features/account/SettingsPage')) }, // SET-01
      { path: 'help', element: page(() => import('@/features/account/HelpPage')) }, // HELP-01
    ],
  },
  {
    path: '/supplier',
    element: (
      <RequireRole role="supplier">
        <AppShell role="supplier" />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="inbox" replace /> },
      { path: 'inbox', element: page(() => import('@/features/supplier/inbox/InboxPage')) }, // SUP-01
      { path: 'inbox/:rfqId', element: page(() => import('@/features/supplier/quote/QuoteFormPage')) }, // SUP-02 / SUP-04
      { path: 'quotations', element: page(() => import('@/features/supplier/quotations/QuotationsPage')) }, // SUP-03
      { path: 'quotations/:quotationId', element: page(() => import('@/features/supplier/quotations/QuotationDetailPage')) }, // SUP-04b
      {
        path: 'profile',
        element: page(() => import('@/features/supplier/profile/ProfileLayout')),
        children: [
          { index: true, element: page(() => import('@/features/supplier/profile/GeneralTab')) }, // SUP-05
          { path: 'capacity', element: page(() => import('@/features/supplier/profile/CapacityTab')) }, // SUP-05b
          { path: 'products', element: page(() => import('@/features/supplier/profile/ProductsTab')) }, // SUP-05c
          { path: 'legal', element: page(() => import('@/features/supplier/profile/LegalTab')) }, // SUP-05d
          { path: 'contacts', element: page(() => import('@/features/supplier/profile/ContactsTab')) }, // SUP-05e
        ],
      },
      { path: 'performance', element: page(() => import('@/features/supplier/performance/PerformancePage')) }, // SUP-06
      { path: 'settings', element: page(() => import('@/features/account/SettingsPage')) }, // SET-01
      { path: 'help', element: page(() => import('@/features/account/HelpPage')) }, // HELP-01
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
