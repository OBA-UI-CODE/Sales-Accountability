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

/** "Ada Bello" -> "AB", "Chioma" -> "CH". Falls back to "?" for an empty name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "+12%" / "-8%" vs yesterday; "0%"/"100%" handles the yesterday=0 edge case. */
export function pctChange(today: number, yesterday: number): string {
  if (yesterday === 0) return today === 0 ? "0%" : "+100%";
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}
