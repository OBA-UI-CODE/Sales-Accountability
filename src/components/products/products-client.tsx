"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PackagePlus, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { matchesSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import { ProductModal } from "./product-modal";
import { RestockModal } from "./restock-modal";
import { RemoveProductModal } from "./remove-product-modal";
import type { Product, ProductVariant } from "@/types/database";

type RestockTarget = {
  kind: "product" | "variant";
  id: string;
  name: string;
  stock_quantity: number;
};

export function ProductsClient({
  products,
  variants,
  userId,
}: {
  products: Product[];
  variants: ProductVariant[];
  userId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [restocking, setRestocking] = useState<RestockTarget | null>(null);
  const [removingProduct, setRemovingProduct] = useState<Product | null>(null);
  const [removingVariantId, setRemovingVariantId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingSizeTo, setAddingSizeTo] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", price: "", stock: "" });
  const [savingDraft, setSavingDraft] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const list = map.get(v.product_id) ?? [];
      list.push(v);
      map.set(v.product_id, list);
    }
    return map;
  }, [variants]);

  const visible = useMemo(() => {
    if (!query.trim()) return products;
    return products.filter((p) => {
      const labels = (variantsByProduct.get(p.id) ?? []).map((v) => v.label).join(" ");
      return matchesSearch(query, p.name, p.category, labels);
    });
  }, [products, query, variantsByProduct]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddVariant(productId: string) {
    const label = draft.label.trim();
    const price = Number(draft.price);
    const stock = Number(draft.stock) || 0;
    if (!label || !(price >= 0)) return;

    setSavingDraft(true);
    const supabase = createClient();
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      label,
      price,
      stock_quantity: stock,
    });
    setSavingDraft(false);

    if (!error) {
      setDraft({ label: "", price: "", stock: "" });
      setAddingSizeTo(null);
      setExpanded((prev) => new Set(prev).add(productId));
      router.refresh();
    }
  }

  async function handleRemoveVariant(variant: ProductVariant) {
    setRemovingVariantId(variant.id);
    const supabase = createClient();
    const { data } = await supabase.rpc("remove_variant", {
      p_variant_id: variant.id,
    });
    setRemovingVariantId(null);
    setToast(
      data === "archived" ? "Size removed (past sales kept)" : "Size removed",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-bold text-text-primary">Products</h1>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-accent-blue-strong"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Product
        </button>
      </div>

      {products.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or sizes"
            className="w-full rounded-[14px] border border-border-subtle bg-surface-input py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
          />
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-muted">
          No products yet. Add your first one to start selling from the
          catalog.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-muted">
          No products match that search.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => {
            const productVariants = variantsByProduct.get(p.id) ?? [];
            const hasVariants = productVariants.length > 0;
            const isOpen = expanded.has(p.id);
            const lowStock = p.stock_quantity <= p.low_stock_threshold;

            return (
              <div key={p.id} className="rounded-[14px] bg-surface-card">
                <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-[10px] bg-icon-circle-bg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {p.category} &middot; {formatNaira(p.default_price)}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-4">
                    {hasVariants ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(p.id)}
                        className="flex items-center gap-1 text-sm font-semibold text-text-primary"
                      >
                        {productVariants.length} size
                        {productVariants.length === 1 ? "" : "s"}
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-text-muted" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    ) : (
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            lowStock ? "text-danger-text" : "text-text-primary"
                          }`}
                        >
                          {p.stock_quantity} in stock
                        </p>
                        {lowStock && (
                          <p className="text-[11px] font-medium text-danger-text">
                            Low stock
                          </p>
                        )}
                      </div>
                    )}
                    {!hasVariants && (
                      <button
                        type="button"
                        onClick={() =>
                          setRestocking({
                            kind: "product",
                            id: p.id,
                            name: p.name,
                            stock_quantity: p.stock_quantity,
                          })
                        }
                        aria-label={`Restock ${p.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-input text-accent-blue"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemovingProduct(p)}
                      aria-label={`Remove ${p.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-input text-danger-text"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {(isOpen || (!hasVariants && addingSizeTo === p.id)) && (
                  <div className="flex flex-col gap-2 border-t border-border-subtle px-4 pb-4 pt-3 md:px-5">
                    {productVariants.map((v) => {
                      const variantLow = v.stock_quantity <= v.low_stock_threshold;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-3 rounded-[10px] bg-surface-input px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {v.label}
                            </p>
                            <p className="text-xs text-text-muted">
                              {formatNaira(v.price)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p
                              className={`text-xs font-semibold ${
                                variantLow ? "text-danger-text" : "text-text-secondary"
                              }`}
                            >
                              {v.stock_quantity} in stock
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setRestocking({
                                  kind: "variant",
                                  id: v.id,
                                  name: `${p.name} · ${v.label}`,
                                  stock_quantity: v.stock_quantity,
                                })
                              }
                              aria-label={`Restock ${p.name} ${v.label}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-card text-accent-blue"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={removingVariantId === v.id}
                              onClick={() => handleRemoveVariant(v)}
                              aria-label={`Remove ${p.name} ${v.label}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-card text-danger-text disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {addingSizeTo === p.id ? (
                      <div className="flex flex-col gap-2 rounded-[10px] bg-surface-input p-3">
                        <div className="flex gap-2">
                          <input
                            value={draft.label}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, label: e.target.value }))
                            }
                            placeholder="e.g. Small"
                            autoFocus
                            className="min-w-0 flex-1 rounded-[10px] border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={draft.price}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, price: e.target.value }))
                            }
                            placeholder="Price"
                            className="w-24 rounded-[10px] border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={draft.stock}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, stock: e.target.value }))
                            }
                            placeholder="Stock"
                            className="w-20 rounded-[10px] border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddingSizeTo(null);
                              setDraft({ label: "", price: "", stock: "" });
                            }}
                            className="flex-1 rounded-[10px] border border-border-subtle py-2 text-xs font-semibold text-text-secondary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingDraft || !draft.label.trim() || !(Number(draft.price) >= 0)}
                            onClick={() => handleAddVariant(p.id)}
                            className="flex-1 rounded-[10px] bg-accent-blue py-2 text-xs font-semibold text-text-primary disabled:opacity-40"
                          >
                            {savingDraft ? "Saving..." : "Save size"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingSizeTo(p.id)}
                        className="flex items-center gap-1.5 self-start rounded-[10px] px-1 py-1 text-xs font-semibold text-accent-blue"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add a size
                      </button>
                    )}
                  </div>
                )}

                {!hasVariants && addingSizeTo !== p.id && (
                  <div className="border-t border-border-subtle px-4 py-2.5 md:px-5">
                    <button
                      type="button"
                      onClick={() => setAddingSizeTo(p.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-accent-blue"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Sells in sizes? Add one
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <ProductModal product={null} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <ProductModal product={editing} onClose={() => setEditing(null)} />
      )}
      {restocking && (
        <RestockModal
          target={restocking}
          userId={userId}
          onClose={() => setRestocking(null)}
        />
      )}
      {removingProduct && (
        <RemoveProductModal
          product={removingProduct}
          onClose={() => setRemovingProduct(null)}
          onRemoved={setToast}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8">
          <div className="rounded-2xl bg-surface-elevated px-5 py-3 text-sm font-medium text-text-primary shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
