import { z } from 'zod';

/** Validation messages are i18n keys in the `common` namespace (resolved by `<Field error>`). */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(1, 'validation.required'),
  remember: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Where to go after signing in: back to the page that sent the user to /login when it belongs to
 * the signed-in role's portal (`home`), otherwise that portal's home.
 */
export function redirectAfterLogin(home: string, from: unknown): string {
  if (typeof from !== 'string') return home;
  return from === home || from.startsWith(`${home}/`) ? from : home;
}
