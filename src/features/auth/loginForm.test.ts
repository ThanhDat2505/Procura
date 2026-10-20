import { describe, expect, it } from 'vitest';
import { loginSchema, redirectAfterLogin } from './loginForm';

describe('redirectAfterLogin', () => {
  it('returns to a page inside the signed-in portal', () => {
    expect(redirectAfterLogin('/buyer', '/buyer/rfqs/rfq-2025-089')).toBe('/buyer/rfqs/rfq-2025-089');
    expect(redirectAfterLogin('/supplier', '/supplier')).toBe('/supplier');
  });
  it('falls back to the portal home for other portals or missing state', () => {
    expect(redirectAfterLogin('/buyer', '/supplier/inbox')).toBe('/buyer');
    expect(redirectAfterLogin('/buyer', '/buyerx')).toBe('/buyer');
    expect(redirectAfterLogin('/supplier', undefined)).toBe('/supplier');
  });
});

describe('loginSchema', () => {
  it('requires a valid email and a password', () => {
    const r = loginSchema.safeParse({ email: 'abc', password: '', remember: true });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain('validation.email');
      expect(msgs).toContain('validation.required');
    }
    expect(loginSchema.safeParse({ email: ' hoang.tn@anphuoc.vn ', password: '123456', remember: false }).success).toBe(true);
  });
});
