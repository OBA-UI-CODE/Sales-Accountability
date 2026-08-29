"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types/database";

export function RemoveProductModal({
  product,
  onClose,
  onRemoved,
}: {
  product: Product;
  onClose: () => void;
  onRemoved: (message: string) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("remove_product", {
      p_product_id: product.id,
    });

    setSubmitting(false);
    if (error) {
      setError("Couldn't remove this product. Try again.");
      return;
    }

    router.refresh();
    onRemoved(
      data === "archived"
        ? "Product removed (past sales kept)"
        : "Product removed",
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="w-full max-w-[400px] rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            Remove Product
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
          Remove &quot;{product.name}&quot;? This can&apos;t be undone.
        </p>

        {error && (
          <p className="mb-4 rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border-subtle py-3.5 text-sm font-semibold text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-danger-bg py-3.5 text-sm font-semibold text-danger-text disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {submitting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
