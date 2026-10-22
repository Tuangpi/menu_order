/**
 * Shared domain types.
 *
 * These mirror the API's business vocabulary. They intentionally hold no
 * behaviour so both the API and the web app can depend on them safely.
 */

/** Roles a user can hold within a restaurant. */
export const ROLES = ['OWNER', 'MANAGER', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

/** Lifecycle of an order. Kept separate from payment status. */
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Payment lifecycle, tracked separately from order status. */
export const PAYMENT_STATUSES = ['UNPAID', 'PENDING_CONFIRMATION', 'PAID', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Payment methods supported at launch. */
export const PAYMENT_METHODS = ['CASH', 'MANUAL_WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Roles permitted to confirm a manual payment. */
export const PAYMENT_CONFIRM_ROLES: readonly Role[] = ['OWNER', 'MANAGER'];

/** A restaurant table with its QR code path. */
export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  /** Relative path used to build the customer QR URL. */
  qrCode: string;
  isActive: boolean;
}

/** A menu category belonging to a restaurant. */
export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  nameEn: string | null;
  sortOrder: number;
  isPublished: boolean;
}

/** A menu item belonging to a restaurant. */
export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  /** Price in whole kyat. */
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
}
