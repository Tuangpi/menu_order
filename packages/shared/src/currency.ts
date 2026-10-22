/**
 * Currency helpers.
 *
 * Myanmar Kyat (MMK) has no practical minor unit. Amounts are therefore
 * represented as whole integers of kyat. Never use floating point for
 * money in this project — it introduces rounding errors in order totals.
 */

/** ISO 4217 code for Myanmar Kyat. */
export const CURRENCY_MMK = 'MMK';

/** Number of minor units per major unit. Kyat has none, so this is 1. */
export const MMK_MINOR_UNITS = 1;

/**
 * Format an integer kyat amount for display, e.g. `12500` -> `"12,500 MMK"`.
 * Input is expected to be an integer number of kyat.
 */
export function formatMMK(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`MMK amount must be an integer, received: ${amount}`);
  }
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  return `${formatted} ${CURRENCY_MMK}`;
}
