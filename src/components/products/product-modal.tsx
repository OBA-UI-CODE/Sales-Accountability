"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types/database";

const CATEGORY_SUGGESTIONS = ["Weave-ons", "Cosmetics", "Other"];

export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "Weave-ons");
  const [price, setPrice] = useState(String(product?.default_price ?? ""));
  const [stock, setStock] = useState(String(product?.stock_quantity ?? "0"));
  const [threshold, setThreshold] = useState(
    String(product?.low_stock_threshold ?? "5"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting && name.trim().length > 0 && Number(price) >= 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      name: name.trim(),
      category: category.trim() || "Other",
      default_price: Number(price),
      low_stock_threshold: Number(threshold) || 5,
    };

    const { error } = isEdit
      ? await supabase.from("products").update(payload).eq("id", product!.id)
      : await supabase
          .from("products")
          .insert({ ...payload, stock_quantity: Number(stock) || 0 });

    setSubmitting(false);
    if (error) {
      setError("Couldn't save this product. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-y-auto rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            {isEdit ? "Edit Product" : "Add Product"}
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

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Attachment - Straight 24in"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="category-suggestions"
              placeholder="Weave-ons"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Default Price (NGN)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary focus:border-border-accent focus:outline-none"
              />
            </div>
            {!isEdit && (
              <div className="flex-1">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Starting Stock
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary focus:border-border-accent focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Low-stock threshold
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary focus:border-border-accent focus:outline-none"
            />
            <p className="mt-2 text-xs text-text-muted">
              You&apos;ll see a low-stock flag once quantity drops to this
              number or below.
            </p>
          </div>
        </div>

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
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
        </button>
      </div>
    </div>
  );
}
