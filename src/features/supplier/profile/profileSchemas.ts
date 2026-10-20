import { z } from 'zod';

/**
 * Form schemas for the supplier profile tabs. Messages are i18n keys: `validation.*` live in `common`,
 * `profile:validation.*` in this feature's namespace (both resolved by `<Field error>`).
 */

const num = (msg = 'validation.number') => z.number({ invalid_type_error: msg, required_error: 'validation.required' });
const positiveInt = () => num().int('validation.integer').positive('validation.positive');
const nonNegativeInt = () => num().int('validation.integer').min(0, 'validation.number');

export const PRODUCT_CERTIFICATIONS = [
  { value: 'ISO 9001', label: 'ISO 9001:2015' },
  { value: 'FSC', label: 'FSC CoC' },
  { value: 'RoHS', label: 'RoHS' },
  { value: 'FDA', label: 'FDA' },
] as const;

export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'validation.required').max(160),
    sku: z.string().trim().min(1, 'validation.required').max(40),
    group: z.string().trim().min(1, 'validation.required'),
    spec: z.string().trim().min(1, 'validation.required').max(500),
    moq: positiveInt(),
    unit: z.string().min(1, 'validation.required'),
    priceMin: num().positive('validation.positive'),
    priceMax: num().positive('validation.positive'),
    leadTimeMinDays: positiveInt(),
    leadTimeMaxDays: positiveInt(),
    certifications: z.array(z.string()),
    visibleToBuyers: z.boolean(),
  })
  .refine((v) => v.priceMin <= v.priceMax, { path: ['priceMax'], message: 'profile:validation.priceRange' })
  .refine((v) => v.leadTimeMinDays <= v.leadTimeMaxDays, { path: ['leadTimeMaxDays'], message: 'profile:validation.leadTimeRange' });

export type ProductFormValues = z.infer<typeof productSchema>;

/** Does a stored certification string ("FSC CoC", "ISO 9001") match a checkbox option ("FSC")? */
export function matchesCertification(stored: string, option: string): boolean {
  return stored.toLowerCase().startsWith(option.toLowerCase());
}

export function productionLineSchema(currentYear: number) {
  return z.object({
    name: z.string().trim().min(1, 'validation.required').max(120),
    kind: z.enum(['corrugating', 'printing']),
    equipmentType: z.string().trim().min(1, 'validation.required'),
    capacity: z.string().trim().min(1, 'validation.required'),
    yearInstalled: num().int('validation.integer').min(1950, 'profile:validation.year').max(currentYear, 'profile:validation.year'),
    status: z.enum(['active', 'maintenance']),
  });
}
export type ProductionLineFormValues = z.infer<ReturnType<typeof productionLineSchema>>;

export const capabilitySchema = z.object({
  factoryAreaM2: positiveInt(),
  monthlyCapacity: positiveInt(),
  lineCount: nonNegativeInt(),
  technicalStaff: nonNegativeInt(),
});
export type CapabilityFormValues = z.infer<typeof capabilitySchema>;

export const samplePolicySchema = z
  .object({
    defaultMoq: positiveInt(),
    sampleLeadTimeHours: positiveInt(),
    freeSample: z.boolean(),
    freeSampleMinOrder: nonNegativeInt(),
    standardLeadTimeMinDays: positiveInt(),
    standardLeadTimeMaxDays: positiveInt(),
  })
  .refine((v) => v.standardLeadTimeMinDays <= v.standardLeadTimeMaxDays, { path: ['standardLeadTimeMaxDays'], message: 'profile:validation.leadTimeRange' });
export type SamplePolicyFormValues = z.infer<typeof samplePolicySchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(80),
  title: z.string().trim().min(1, 'validation.required').max(120),
  email: z.string().trim().min(1, 'validation.required').email('validation.email'),
  phone: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .regex(/^\+?[0-9][0-9 .-]{7,15}$/, 'profile:validation.phone'),
  responsibility: z.string().trim().max(160),
  notifyNewRfq: z.boolean(),
  isPrimary: z.boolean(),
  visibleToBuyers: z.boolean(),
});
export type ContactFormValues = z.infer<typeof contactSchema>;

/** The certificate upload form; the expiry date must be in the future relative to `now`. */
export function certificateSchema(now: Date) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return z.object({
    fileName: z.string().min(1, 'profile:validation.fileRequired'),
    name: z.string().min(1, 'validation.required'),
    issuer: z.string().trim().min(1, 'validation.required'),
    number: z.string().trim().min(1, 'validation.required'),
    validTo: z
      .string()
      .min(1, 'validation.required')
      .refine((d) => d > today, 'profile:validation.expiryFuture'),
  });
}
export type CertificateFormValues = z.infer<ReturnType<typeof certificateSchema>>;

export const GENERAL_SCHEMA_MIN_YEAR = 1900;

export function generalInfoSchema(currentYear: number) {
  return z.object({
    description: z.string().trim().min(1, 'validation.required').max(2000),
    foundedYear: num().int('validation.integer').min(GENERAL_SCHEMA_MIN_YEAR, 'profile:validation.year').max(currentYear, 'profile:validation.year'),
    employeesLabel: z.string().trim().max(60),
    website: z.string().trim().max(120),
  });
}
export type GeneralInfoFormValues = z.infer<ReturnType<typeof generalInfoSchema>>;
