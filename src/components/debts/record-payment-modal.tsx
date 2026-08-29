"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/currency";
import { amountOwed } from "@/lib/payment";
import type { SaleWithRelations } from "@/types/database";

export function RecordPaymentModal({
  sale,
  onClose,
}: {
  sale: SaleWithRelations;
  onClose: () => void;
}) {
  const router = useRouter();
  const owed = amountOwed(sale);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting && Number(amount) > 0 && Number(amount) <= owed;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("record_payment", {
      p_sale_id: sale.id,
      p_amount: Number(amount),
    });

    setSubmitting(false);
    if (error) {
      setError("Couldn't record that payment. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="w-full max-w-[400px] rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-6 text-sm text-text-secondary">
          {sale.product?.name ?? sale.custom_item_name}
          {sale.debtor_name && ` · ${sale.debtor_name}`} &middot; owes{" "}
          {formatNaira(owed)}
        </p>

        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Amount to pay
        </label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={owed}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          autoFocus
          className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
        />

        {error && (
          <p className="mt-4 rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-6 w-full rounded-2xl bg-accent-blue py-4 text-[15px] font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </div>
  );
}
