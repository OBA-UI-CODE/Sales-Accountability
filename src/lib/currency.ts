/**
 * Naira currency formatting.
 *
 * NOTE: a literal space is intentionally inserted between the ₦ symbol and
 * the digits (e.g. "₦ 4,500" not "₦4,500"). This mirrors a font-rendering
 * fix applied throughout the design system: in several fonts the ₦
 * glyph's crossbar visually bleeds into an immediately-following digit,
 * making amounts look struck-through. Keep this convention everywhere a
 * Naira amount is rendered.
 */
export function formatNaira(amount: number): string {
  const formatted = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `₦ ${formatted}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("en-NG").format(amount);
}
