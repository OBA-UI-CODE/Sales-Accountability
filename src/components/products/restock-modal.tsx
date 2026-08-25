"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types/database";

export function RestockModal({
  product,
  userId,
  onClose,
}: {
  product: Product;
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !submitting && Number(amount) > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("restock_product", {
      p_product_id: product.id,
      p_quantity_added: Number(amount),
      p_adjusted_by: userId,
    });

    setSubmitting(false);
    if (error) {
      setError("Couldn't restock this product. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="w-full max-w-[400px] rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Add Stock</h2>
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
          {product.name} &middot; currently {product.stock_quantity} in stock
        </p>

        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Quantity to add
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 10"
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
          {submitting ? "Saving..." : "Add Stock"}
        </button>
      </div>
    </div>
  );
}
