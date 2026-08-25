"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/currency";
import type { Product } from "@/types/database";

type Mode = "catalog" | "manual";

export function AddSaleModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [customName, setCustomName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setProducts(data);
        setLoadingProducts(false);
      });
  }, []);

  const matches = useMemo(() => {
    if (!query.trim() || selected) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, products, selected]);

  function selectProduct(p: Product) {
    setSelected(p);
    setQuery(p.name);
    setPrice(String(p.default_price));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSelected(null);
    setQuery("");
    setCustomName("");
    setPrice("");
  }

  const total = (Number(price) || 0) * quantity;
  const canSubmit =
    !submitting &&
    Number(price) > 0 &&
    quantity > 0 &&
    (mode === "catalog" ? !!selected : customName.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("create_sale", {
      p_product_id: mode === "catalog" ? selected!.id : null,
      p_custom_item_name: mode === "manual" ? customName.trim() : null,
      p_unit_price: Number(price),
      p_quantity: quantity,
      p_sold_by: userId,
    });

    setSubmitting(false);

    if (error) {
      setError("Couldn't save that sale. Try again.");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-y-auto rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Add Sale</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Entry mode toggle */}
        <div className="mb-6 flex rounded-xl border border-border-subtle bg-surface-input p-1">
          <button
            type="button"
            onClick={() => switchMode("catalog")}
            className={`flex-1 rounded-[9px] py-2 text-xs font-semibold transition ${
              mode === "catalog"
                ? "bg-accent-blue text-text-primary"
                : "text-text-muted"
            }`}
          >
            From Catalog
          </button>
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`flex-1 rounded-[9px] py-2 text-xs font-semibold transition ${
              mode === "manual"
                ? "bg-accent-blue text-text-primary"
                : "text-text-muted"
            }`}
          >
            Type Manually
          </button>
        </div>

        {mode === "catalog" ? (
          <div className="mb-6">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Product
            </label>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Search products by name"
                className={`w-full rounded-[14px] border bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none ${
                  selected ? "border-border-accent" : "border-border-subtle"
                }`}
              />
              {matches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[14px] border border-border-subtle bg-surface-card shadow-lg">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectProduct(p)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-elevated"
                      >
                        <span>{p.name}</span>
                        <span className="text-xs text-text-muted">
                          {formatNaira(p.default_price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!loadingProducts &&
                query.trim() &&
                !selected &&
                matches.length === 0 && (
                  <p className="mt-2 text-xs text-text-muted">
                    No matching product. Switch to &quot;Type Manually&quot;
                    to log a one-off item.
                  </p>
                )}
            </div>

            {selected && (
              <div className="mt-3 flex items-center gap-3 rounded-[14px] bg-surface-input p-4">
                <div className="h-10 w-10 shrink-0 rounded-[10px] bg-icon-circle-bg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {selected.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {selected.category} &middot; Default price{" "}
                    {formatNaira(selected.default_price)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Product Name
            </label>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Ankara Fabric - 2 yards"
              className="w-full rounded-[14px] border border-border-accent bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Price (NGN)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[18px] font-semibold text-text-primary placeholder:text-text-muted placeholder:font-normal focus:border-border-accent focus:outline-none"
            />
          </div>
          <div className="w-[110px]">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Quantity
            </label>
            <div className="flex items-center justify-between rounded-[14px] border border-border-subtle bg-surface-input px-2 py-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-card text-text-primary"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-[18px] font-semibold text-text-primary">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-blue text-text-primary"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 border-t border-border-subtle pt-6">
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-text-secondary">Total</span>
            <span className="text-2xl font-bold text-text-primary">
              {formatNaira(total)}
            </span>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-accent-blue py-4 text-[15px] font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save Sale"}
        </button>
      </div>
    </div>
  );
}
