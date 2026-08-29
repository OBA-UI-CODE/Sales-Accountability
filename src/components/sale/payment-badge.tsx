import { paymentBadge, type SalePaymentFields } from "@/lib/payment";

const TONE_CLASSES: Record<"success" | "warning" | "danger", string> = {
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  danger: "bg-danger-bg text-danger-text",
};

export function PaymentBadge({ sale }: { sale: SalePaymentFields }) {
  const { label, tone } = paymentBadge(sale);
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
