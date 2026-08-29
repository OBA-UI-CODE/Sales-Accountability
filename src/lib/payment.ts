/**
 * Payment status is DERIVED from amount_paid vs the sale total — it is never
 * stored as its own column, so the label can never disagree with the numbers.
 * See supabase/migrations/0007_payments_and_product_removal.sql.
 *
 *   amount_paid <= 0            -> "unpaid"    (owes the full total)
 *   0 < amount_paid < total     -> "part_paid" (owes total - amount_paid)
 *   amount_paid >= total        -> "paid"      (owes nothing)
 */

export type PaymentStatus = "paid" | "part_paid" | "unpaid";

export interface SalePaymentFields {
  unit_price: number;
  quantity: number;
  total_price?: number | null;
  amount_paid: number;
}

/** The sale's total, tolerant of older rows where total_price may be null. */
export function saleTotal(sale: SalePaymentFields): number {
  return sale.total_price ?? sale.unit_price * sale.quantity;
}

/** Amount still owed on this sale (never negative). */
export function amountOwed(sale: SalePaymentFields): number {
  return Math.max(0, saleTotal(sale) - (sale.amount_paid ?? 0));
}

/** Derive the payment status from how much has been paid. */
export function paymentStatus(sale: SalePaymentFields): PaymentStatus {
  const total = saleTotal(sale);
  const paid = sale.amount_paid ?? 0;
  if (paid <= 0) return "unpaid";
  if (paid < total) return "part_paid";
  return "paid";
}

/** True when this sale still has an outstanding balance (for the Debts list). */
export function isDebt(sale: SalePaymentFields): boolean {
  return amountOwed(sale) > 0;
}

/** Human label + a semantic tone key the UI can map to badge colours. */
export function paymentBadge(sale: SalePaymentFields): {
  status: PaymentStatus;
  label: string;
  tone: "success" | "warning" | "danger";
} {
  const status = paymentStatus(sale);
  switch (status) {
    case "paid":
      return { status, label: "Paid", tone: "success" };
    case "part_paid":
      return { status, label: "Part-paid", tone: "warning" };
    case "unpaid":
      return { status, label: "Not paid", tone: "danger" };
  }
}
