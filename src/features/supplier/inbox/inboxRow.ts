import type { QuotationStatus } from '@/domain/types';
import type { InboxItem } from '@/services';

/** What the "Trạng thái" column shows for an inbox row. */
export type InboxRowStatus = { kind: 'new' } | { kind: 'drafting' } | { kind: 'quotation'; status: QuotationStatus } | { kind: 'declined' } | { kind: 'expired' };

export function inboxRowStatus(item: Pick<InboxItem, 'tab' | 'quotation' | 'declined'>): InboxRowStatus {
  if (item.tab === 'new') return { kind: 'new' };
  if (item.tab === 'drafting') return { kind: 'drafting' };
  if (item.quotation && item.quotation.status !== 'draft') return { kind: 'quotation', status: item.quotation.status };
  return item.declined ? { kind: 'declined' } : { kind: 'expired' };
}

/** Which action button the row offers. */
export type InboxRowAction = 'quote' | 'continue' | 'viewQuotation' | 'viewRfq';

export function inboxRowAction(item: Pick<InboxItem, 'tab' | 'quotation'>): InboxRowAction {
  switch (item.tab) {
    case 'new':
      return 'quote';
    case 'drafting':
      return 'continue';
    case 'submitted':
      return item.quotation ? 'viewQuotation' : 'viewRfq';
    default:
      return 'viewRfq';
  }
}
