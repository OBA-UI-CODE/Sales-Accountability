"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SaleList } from "@/components/sale/sale-list";
import { matchesSearch } from "@/lib/search";
import type { SaleWithRelations } from "@/types/database";

export function HistoryList({ sales }: { sales: SaleWithRelations[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return sales;
    return sales.filter((s) =>
      matchesSearch(
        query,
        s.product?.name,
        s.custom_item_name,
        s.variant?.label,
        s.seller?.name,
        s.debtor_name,
      ),
    );
  }, [sales, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by product or staff name"
          className="w-full rounded-[14px] border border-border-subtle bg-surface-input py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
        />
      </div>
      <SaleList
        sales={filtered}
        emptyMessage={
          sales.length === 0
            ? "No sales logged on this date."
            : "No sales match that filter."
        }
      />
    </div>
  );
}
