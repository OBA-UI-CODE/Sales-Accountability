"use client";

import { useState } from "react";
import { Plus, PackagePlus } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { ProductModal } from "./product-modal";
import { RestockModal } from "./restock-modal";
import type { Product } from "@/types/database";

export function ProductsClient({
  products,
  userId,
}: {
  products: Product[];
  userId: string;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);

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

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-muted">
          No products yet. Add your first one to start selling from the
          catalog.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const lowStock = p.stock_quantity <= p.low_stock_threshold;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-[14px] bg-surface-card px-4 py-4 md:px-5"
              >
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
                  <button
                    type="button"
                    onClick={() => setRestocking(p)}
                    aria-label={`Restock ${p.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-input text-accent-blue"
                  >
                    <PackagePlus className="h-4 w-4" />
                  </button>
                </div>
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
          product={restocking}
          userId={userId}
          onClose={() => setRestocking(null)}
        />
      )}
    </div>
  );
}
