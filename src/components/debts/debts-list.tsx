"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/currency";
import { formatDateLagos } from "@/lib/date";
import { amountOwed } from "@/lib/payment";
import { PaymentBadge } from "@/components/sale/payment-badge";
import { ReceiptButton } from "@/components/sale/receipt-button";
import { RecordPaymentModal } from "./record-payment-modal";
import type { SaleWithRelations } from "@/types/database";

export function DebtsList({ sales }: { sales: SaleWithRelations[] }) {
  const router = useRouter();
  const [paying, setPaying] = useState<SaleWithRelations | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleMarkFullyPaid(sale: SaleWithRelations) {
    setMarkingId(sale.id);
    const supabase = createClient();
    await supabase.rpc("record_payment", {
      p_sale_id: sale.id,
      p_pay_full: true,
    });
    setMarkingId(null);
    router.refresh();
  }

  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-muted">
        No outstanding debts. Nice.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {sales.map((sale) => {
          const owed = amountOwed(sale);
          const dateStr = sale.sold_at.slice(0, 10);
          return (
            <div
              key={sale.id}
              className="flex flex-col gap-3 rounded-[14px] bg-surface-card px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {sale.product?.name ?? sale.custom_item_name}
                  </p>
                  <PaymentBadge sale={sale} />
                </div>
                <p className="mt-1 truncate text-xs text-text-muted">
                  {sale.debtor_name ?? "No name"} &middot;{" "}
                  {formatDateLagos(dateStr)} &middot; logged by{" "}
                  {sale.seller?.name ?? "Unknown"}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Total {formatNaira(sale.total_price)} &middot; Paid{" "}
                  {formatNaira(sale.amount_paid)} &middot;{" "}
                  <span className="font-semibold text-danger-text">
                    Owes {formatNaira(owed)}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <ReceiptButton saleId={sale.id} label="Receipt" />
                <button
                  type="button"
                  onClick={() => setPaying(sale)}
                  className="flex items-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:bg-surface-elevated"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  Record payment
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkFullyPaid(sale)}
                  disabled={markingId === sale.id}
                  className="rounded-xl bg-accent-blue px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-40"
                >
                  {markingId === sale.id ? "Saving..." : "Mark fully paid"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {paying && (
        <RecordPaymentModal sale={paying} onClose={() => setPaying(null)} />
      )}
    </>
  );
}
