"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/currency";
import { formatTimeLagos } from "@/lib/date";
import { paymentStatus } from "@/lib/payment";
import { PaymentFields, type PaymentMode } from "./payment-fields";
import type { Product, SaleWithRelations } from "@/types/database";

type Mode = "catalog" | "manual";

function initialPaymentMode(sale: SaleWithRelations): PaymentMode {
  const status = paymentStatus(sale);
  return status === "part_paid" ? "part" : status === "unpaid" ? "unpaid" : "paid";
}

export function EditSaleModal({
  sale,
  onClose,
}: {
  sale: SaleWithRelations;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(sale.product_id ? "catalog" : "manual");
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(sale.product?.name ?? "");
  const [selected, setSelected] = useState<Product | null>(null);
  const [customName, setCustomName] = useState(sale.custom_item_name ?? "");
  const [price, setPrice] = useState<string>(String(sale.unit_price));
  const [quantity, setQuantity] = useState(sale.quantity);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    initialPaymentMode(sale),
  );
  const [amountPaidInput, setAmountPaidInput] = useState(
    String(sale.amount_paid),
  );
  const [debtorName, setDebtorName] = useState(sale.debtor_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        setProducts(data);
        if (sale.product_id) {
          const match = data.find((p) => p.id === sale.product_id);
          if (match) setSelected(match);
        }
      });
  }, [sale.product_id]);

  const matches = useMemo(() => {
    if (!query.trim() || selected) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, products, selected]);

  function selectProduct(p: Product) {
    setSelected(p);
    setQuery(p.name);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next === "manual") {
      setSelected(null);
      setQuery("");
    }
  }

  const total = (Number(price) || 0) * quantity;
  const canSubmit =
    !submitting &&
    Number(price) > 0 &&
    quantity > 0 &&
    (mode === "catalog" ? !!selected : customName.trim().length > 0) &&
    (paymentMode !== "part" ||
      (Number(amountPaidInput) > 0 && Number(amountPaidInput) < total));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const amountPaidValue =
      paymentMode === "paid"
        ? total
        : paymentMode === "part"
          ? Number(amountPaidInput)
          : 0;
    const debtorNameValue =
      paymentMode === "paid" ? undefined : debtorName.trim() || undefined;

    const supabase = createClient();
    const { error } = await supabase.rpc("update_sale", {
      p_sale_id: sale.id,
      p_product_id: mode === "catalog" ? selected!.id : null,
      p_custom_item_name: mode === "manual" ? customName.trim() : null,
      p_unit_price: Number(price),
      p_quantity: quantity,
      p_amount_paid: amountPaidValue,
      p_debtor_name: debtorNameValue,
    });

    setSubmitting(false);
    if (error) {
      setError("Couldn't save those changes. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_sale", {
      p_sale_id: sale.id,
    });
    setDeleting(false);
    if (error) {
      setError("Couldn't delete this sale. Try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-y-auto rounded-t-[24px] bg-surface-elevated p-8 md:rounded-[24px]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Edit Sale</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-6 text-xs text-text-muted">
          Logged {formatTimeLagos(sale.sold_at)} by{" "}
          {sale.seller?.name ?? "someone"}
          {sale.edited_at && " · edited"}
        </p>

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
            </div>
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
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[18px] font-semibold text-text-primary focus:border-border-accent focus:outline-none"
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

        <PaymentFields
          mode={paymentMode}
          setMode={setPaymentMode}
          amountPaid={amountPaidInput}
          setAmountPaid={setAmountPaidInput}
          debtorName={debtorName}
          setDebtorName={setDebtorName}
          total={total}
        />

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

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full rounded-2xl bg-accent-blue py-4 text-[15px] font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-40"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>

          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-danger-bg py-3.5 text-sm font-semibold text-danger-text"
            >
              <Trash2 className="h-4 w-4" />
              Delete Sale
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-2xl border border-border-subtle py-3.5 text-sm font-semibold text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-danger-bg py-3.5 text-sm font-semibold text-danger-text disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
