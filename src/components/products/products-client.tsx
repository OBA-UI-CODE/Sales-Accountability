"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/currency";
import { matchesSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import { RestockModal } from "./restock-modal";
import { RemoveProductModal } from "./remove-product-modal";
import type { Product, ProductVariant } from "@/types/database";

type DraftVariant = { label: string; price: string; stock: string };
type RestockTarget = {
  kind: "product" | "variant";
  id: string;
  name: string;
  stock_quantity: number;
};

const EMPTY_VARIANT: DraftVariant = { label: "", price: "", stock: "" };

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
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [hasSizes, setHasSizes] = useState(false);
  const [drafts, setDrafts] = useState<DraftVariant[]>([{ ...EMPTY_VARIANT }]);
  const [addingSizeTo, setAddingSizeTo] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<DraftVariant>({ ...EMPTY_VARIANT });
  const [restocking, setRestocking] = useState<RestockTarget | null>(null);
  const [removingProduct, setRemovingProduct] = useState<Product | null>(null);
  const [removingVariantId, setRemovingVariantId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const variantsByProduct = useMemo(() => {
    const grouped = new Map<string, ProductVariant[]>();
    for (const variant of variants) {
      const list = grouped.get(variant.product_id) ?? [];
      list.push(variant);
      grouped.set(variant.product_id, list);
    }
    return grouped;
  }, [variants]);

  const visible = useMemo(
    () => products.filter((product) => {
      const labels = (variantsByProduct.get(product.id) ?? []).map((variant) => variant.label).join(" ");
      return matchesSearch(query, product.name, product.category, labels);
    }),
    [products, query, variantsByProduct],
  );

  function resetAddForm() {
    setShowForm(false);
    setHasSizes(false);
    setDrafts([{ ...EMPTY_VARIANT }]);
    setError(null);
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const category = String(form.get("category") ?? "").trim() || "General";
    const validVariants = hasSizes ? drafts.filter((draft) => draft.label.trim()) : [];

    if (!name || (hasSizes && validVariants.length === 0)) {
      setError(hasSizes ? "Add at least one size or pack." : "Enter a product name.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name,
        category,
        default_price: hasSizes ? 0 : Number(form.get("price")) || 0,
        stock_quantity: hasSizes ? 0 : Number(form.get("stock")) || 0,
      })
      .select("id")
      .single();

    if (productError || !product) {
      setSaving(false);
      setError("Couldn't add this product. Try again.");
      return;
    }

    if (validVariants.length > 0) {
      const { error: variantError } = await supabase.from("product_variants").insert(
        validVariants.map((draft) => ({
          product_id: product.id,
          label: draft.label.trim(),
          price: Number(draft.price) || 0,
          stock_quantity: Number(draft.stock) || 0,
        })),
      );
      if (variantError) {
        await supabase.from("products").delete().eq("id", product.id);
        setSaving(false);
        setError("Couldn't save the product sizes. Try again.");
        return;
      }
    }

    setSaving(false);
    resetAddForm();
    router.refresh();
  }

  async function handleAddVariant(productId: string) {
    if (!newSize.label.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: variantError } = await supabase.from("product_variants").insert({
      product_id: productId,
      label: newSize.label.trim(),
      price: Number(newSize.price) || 0,
      stock_quantity: Number(newSize.stock) || 0,
    });
    setSaving(false);
    if (variantError) {
      setError("Couldn't add this size. Try again.");
      return;
    }
    setNewSize({ ...EMPTY_VARIANT });
    setAddingSizeTo(null);
    router.refresh();
  }

  async function handleRemoveVariant(variant: ProductVariant) {
    setRemovingVariantId(variant.id);
    const supabase = createClient();
    const { data, error: removeError } = await supabase.rpc("remove_variant", { p_variant_id: variant.id });
    setRemovingVariantId(null);
    if (removeError) {
      setToast("Couldn't remove this size");
      return;
    }
    setToast(data === "archived" ? "Size removed (past sales kept)" : "Size removed");
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-semibold text-text-primary">Products</h1>
        <button type="button" onClick={() => (showForm ? resetAddForm() : setShowForm(true))} className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-accent-blue px-4 text-sm font-semibold text-white transition hover:bg-accent-blue-strong sm:px-5">
          {showForm ? <X className="h-[18px] w-[18px]" /> : <Plus className="h-[18px] w-[18px]" />}
          <span className="hidden sm:inline">{showForm ? "Cancel" : "Add Product"}</span>
          <span className="sm:hidden">{showForm ? "Close" : "Add"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddProduct} className="flex flex-col gap-5 rounded-[14px] bg-surface-card p-4 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <input name="name" required autoFocus placeholder="Product name (e.g. Relaxer)" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:flex-1" />
            <input name="category" placeholder="Category" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:flex-1" />
            {!hasSizes && (
              <>
                <input name="price" type="number" inputMode="decimal" min="0" required placeholder="Price" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-32" />
                <input name="stock" type="number" inputMode="numeric" min="0" required placeholder="Stock" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-28" />
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={hasSizes} onChange={(event) => setHasSizes(event.target.checked)} className="h-4 w-4 accent-accent-blue" />
            This product comes in different sizes or packs
          </label>

          {hasSizes && (
            <div className="flex flex-col gap-4 overflow-hidden rounded-[12px] bg-surface-base p-4">
              <p className="text-xs leading-5 text-text-muted">Give each size its own price and stock. Selling one size will not change another size&apos;s stock.</p>
              {drafts.map((draft, index) => (
                <div key={index} className="flex flex-col gap-3 md:flex-row md:gap-2">
                  <input value={draft.label} onChange={(event) => setDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} placeholder="Size (e.g. Small, Big 12-pack)" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-card px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:flex-1" />
                  <input value={draft.price} onChange={(event) => setDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, price: event.target.value } : row))} type="number" inputMode="decimal" min="0" placeholder="Price" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-card px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-28" />
                  <input value={draft.stock} onChange={(event) => setDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, stock: event.target.value } : row))} type="number" inputMode="numeric" min="0" placeholder="Stock" className="h-11 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-card px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-24" />
                  {drafts.length > 1 && <button type="button" onClick={() => setDrafts((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove this size" className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-[10px] bg-surface-elevated text-text-secondary md:self-auto"><X className="h-4 w-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setDrafts((rows) => [...rows, { ...EMPTY_VARIANT }])} className="self-start text-sm font-semibold text-accent-blue">+ Add another size</button>
            </div>
          )}

          {error && <p role="alert" className="rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">{error}</p>}
          <button type="submit" disabled={saving} className="h-11 self-start rounded-[10px] bg-accent-blue px-5 text-sm font-semibold text-white transition hover:bg-accent-blue-strong disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </form>
      )}

      {products.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-secondary" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your products" aria-label="Search your products" className="h-12 w-full rounded-[14px] border border-border-subtle bg-surface-card pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated text-text-secondary"><X className="h-3.5 w-3.5" /></button>}
          </div>
          {query.trim() && <p role="status" className="text-sm text-text-secondary">{visible.length === 0 ? "No product matches that." : `${visible.length} of ${products.length} products`}</p>}
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        {products.length === 0 && <p className="rounded-[14px] border border-dashed border-border-subtle p-6 text-center text-text-secondary">No products yet. Add your first one above.</p>}
        {products.length > 0 && visible.length === 0 && <p className="rounded-[14px] border border-dashed border-border-subtle p-6 text-center text-text-secondary">Nothing matches &ldquo;{query.trim()}&rdquo;. Try a shorter word or a size name.</p>}

        {visible.map((product) => {
          const productVariants = variantsByProduct.get(product.id) ?? [];
          const hasVariants = productVariants.length > 0;
          const totalStock = hasVariants ? productVariants.reduce((sum, variant) => sum + variant.stock_quantity, 0) : product.stock_quantity;
          const lowStock = totalStock <= product.low_stock_threshold;
          return (
            <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-surface-card">
              <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-[10px] bg-icon-circle-bg" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-text-primary sm:text-lg">{product.name}</p>
                    <p className="truncate text-sm text-text-secondary">{product.category || "General"}{hasVariants ? ` · ${productVariants.length} sizes` : ` · ${formatNaira(product.default_price)}`}</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border-subtle pt-3 sm:shrink-0 sm:justify-end sm:border-0 sm:pt-0">
                  <div className="flex min-w-0 flex-col sm:items-end"><span className={`text-sm ${lowStock ? "text-danger-text" : "text-text-primary"}`}>{totalStock} in stock</span>{lowStock && <span className="text-xs text-danger-text">Low stock</span>}</div>
                  <div className="flex shrink-0 gap-2">
                    {!hasVariants && <button type="button" onClick={() => setRestocking({ kind: "product", id: product.id, name: product.name, stock_quantity: product.stock_quantity })} title="Restock" aria-label={`Restock ${product.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition hover:text-accent-blue"><RefreshCw className="h-4 w-4" /></button>}
                    <button type="button" onClick={() => setRemovingProduct(product)} title="Remove product" aria-label={`Remove ${product.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition hover:text-danger-text"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>

              {hasVariants && (
                <div className="flex min-w-0 flex-col gap-3 border-t border-border-subtle px-4 py-4 sm:gap-2 sm:px-5 sm:py-3">
                  {productVariants.map((variant) => {
                    const variantLow = variant.stock_quantity <= variant.low_stock_threshold;
                    return (
                      <div key={variant.id} className="flex min-w-0 flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="flex min-w-0 items-baseline gap-1"><span className="truncate text-text-primary">{variant.label}</span><span className="shrink-0 text-text-muted">· {formatNaira(variant.price)}</span></span>
                        <span className="flex shrink-0 items-center justify-between gap-3 sm:justify-end"><span className={variantLow ? "text-danger-text" : "text-text-secondary"}>{variant.stock_quantity} in stock</span><span className="flex gap-2"><button type="button" onClick={() => setRestocking({ kind: "variant", id: variant.id, name: `${product.name} · ${variant.label}`, stock_quantity: variant.stock_quantity })} title={`Restock ${variant.label}`} aria-label={`Restock ${product.name} ${variant.label}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition hover:text-accent-blue"><RefreshCw className="h-3.5 w-3.5" /></button><button type="button" disabled={removingVariantId === variant.id} onClick={() => handleRemoveVariant(variant)} title={`Remove ${variant.label}`} aria-label={`Remove ${product.name} ${variant.label}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition hover:text-danger-text disabled:opacity-40"><X className="h-3.5 w-3.5" /></button></span></span>
                      </div>
                    );
                  })}

                  {addingSizeTo === product.id ? (
                    <div className="flex flex-col gap-3 pt-1 md:flex-row md:gap-2">
                      <input value={newSize.label} onChange={(event) => setNewSize((current) => ({ ...current, label: event.target.value }))} placeholder="Size" autoFocus className="h-10 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:flex-1" />
                      <input value={newSize.price} onChange={(event) => setNewSize((current) => ({ ...current, price: event.target.value }))} type="number" inputMode="decimal" min="0" placeholder="Price" className="h-10 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-28" />
                      <input value={newSize.stock} onChange={(event) => setNewSize((current) => ({ ...current, stock: event.target.value }))} type="number" inputMode="numeric" min="0" placeholder="Stock" className="h-10 w-full min-w-0 rounded-[10px] border border-border-subtle bg-surface-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none md:w-24" />
                      <div className="flex gap-2"><button type="button" onClick={() => { setAddingSizeTo(null); setNewSize({ ...EMPTY_VARIANT }); }} className="h-10 flex-1 rounded-[10px] border border-border-subtle px-4 text-sm font-semibold text-text-secondary md:flex-none">Cancel</button><button type="button" onClick={() => handleAddVariant(product.id)} disabled={saving || !newSize.label.trim()} className="h-10 flex-1 rounded-[10px] bg-accent-blue px-4 text-sm font-semibold text-white disabled:opacity-50 md:flex-none">{saving ? "Adding..." : "Add"}</button></div>
                    </div>
                  ) : <button type="button" onClick={() => { setAddingSizeTo(product.id); setNewSize({ ...EMPTY_VARIANT }); }} className="self-start pt-1 text-sm font-semibold text-accent-blue">+ Add size</button>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {error && !showForm && <p role="alert" className="rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">{error}</p>}
      {restocking && <RestockModal target={restocking} userId={userId} onClose={() => setRestocking(null)} />}
      {removingProduct && <RemoveProductModal product={removingProduct} onClose={() => setRemovingProduct(null)} onRemoved={setToast} />}
      {toast && <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8"><div className="rounded-2xl bg-surface-elevated px-5 py-3 text-sm font-medium text-text-primary shadow-lg">{toast}</div></div>}
    </div>
  );
}
