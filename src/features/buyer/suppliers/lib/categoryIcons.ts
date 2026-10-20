import type { CategoryId } from '@/domain/types';

/** Material Symbols used for each category on supplier tiles and saved-list menus. */
export const CATEGORY_ICONS: Record<CategoryId, string> = {
  packaging: 'inventory_2',
  'office-supplies': 'edit_note',
  'office-equipment': 'print',
  industrial: 'precision_manufacturing',
  apparel: 'checkroom',
  furniture: 'chair',
  chemicals: 'science',
};
