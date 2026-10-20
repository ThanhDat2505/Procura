import type { Quotation } from '@/domain/types';
import { inboxRowAction, inboxRowStatus } from './inboxRow';

const quote = (status: Quotation['status']) => ({ status }) as Quotation;

describe('inboxRowStatus', () => {
  it('maps tabs and quotation states to the status column', () => {
    expect(inboxRowStatus({ tab: 'new', declined: false })).toEqual({ kind: 'new' });
    expect(inboxRowStatus({ tab: 'drafting', declined: false, quotation: quote('draft') })).toEqual({ kind: 'drafting' });
    expect(inboxRowStatus({ tab: 'submitted', declined: false, quotation: quote('viewed') })).toEqual({ kind: 'quotation', status: 'viewed' });
    expect(inboxRowStatus({ tab: 'closed', declined: false, quotation: quote('awarded') })).toEqual({ kind: 'quotation', status: 'awarded' });
    expect(inboxRowStatus({ tab: 'closed', declined: true })).toEqual({ kind: 'declined' });
    expect(inboxRowStatus({ tab: 'closed', declined: false })).toEqual({ kind: 'expired' });
    expect(inboxRowStatus({ tab: 'closed', declined: false, quotation: quote('draft') })).toEqual({ kind: 'expired' });
  });
});

describe('inboxRowAction', () => {
  it('offers the right button per tab', () => {
    expect(inboxRowAction({ tab: 'new' })).toBe('quote');
    expect(inboxRowAction({ tab: 'drafting', quotation: quote('draft') })).toBe('continue');
    expect(inboxRowAction({ tab: 'submitted', quotation: quote('submitted') })).toBe('viewQuotation');
    expect(inboxRowAction({ tab: 'closed', quotation: quote('awarded') })).toBe('viewRfq');
  });
});
