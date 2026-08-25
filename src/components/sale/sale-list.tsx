"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/currency";
import { formatTimeLagos } from "@/lib/date";
import { EditSaleModal } from "./edit-sale-modal";
import type { SaleWithRelations } from "@/types/database";

export function SaleList({
  sales,
  emptyMessage = "No sales logged yet.",
}: {
  sales: SaleWithRelations[];
  emptyMessage?: string;
}) {
  const [editing, setEditing] = useState<SaleWithRelations | null>(null);

  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle px-6 py-10 text-center text-sm text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {sales.map((sale) => (
          <button
            key={sale.id}
            type="button"
            onClick={() => setEditing(sale)}
            className="flex items-center justify-between gap-4 rounded-[14px] bg-surface-card px-4 py-3.5 text-left transition hover:bg-surface-elevated md:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-icon-circle-bg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {sale.product?.name ?? sale.custom_item_name}
                  {sale.edited_at && (
                    <span className="ml-2 text-[10px] font-medium text-text-muted">
                      edited
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {sale.product?.category ?? "Custom item"} &middot;{" "}
                  {formatTimeLagos(sale.sold_at)}
                  {sale.quantity > 1 && ` · x${sale.quantity}`}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-text-primary">
              {formatNaira(sale.total_price)}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <EditSaleModal sale={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
