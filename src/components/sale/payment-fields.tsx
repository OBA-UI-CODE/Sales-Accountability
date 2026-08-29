"use client";

import type { Dispatch, SetStateAction } from "react";
import { formatNaira } from "@/lib/currency";

export type PaymentMode = "paid" | "part" | "unpaid";

const OPTIONS: [PaymentMode, string][] = [
  ["paid", "Paid"],
  ["part", "Part-paid"],
  ["unpaid", "Not paid"],
];

export function PaymentFields({
  mode,
  setMode,
  amountPaid,
  setAmountPaid,
  debtorName,
  setDebtorName,
  total,
}: {
  mode: PaymentMode;
  setMode: Dispatch<SetStateAction<PaymentMode>>;
  amountPaid: string;
  setAmountPaid: Dispatch<SetStateAction<string>>;
  debtorName: string;
  setDebtorName: Dispatch<SetStateAction<string>>;
  total: number;
}) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Payment
      </label>
      <div className="flex rounded-xl border border-border-subtle bg-surface-input p-1">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex-1 rounded-[9px] py-2 text-xs font-semibold transition ${
              mode === value
                ? "bg-accent-blue text-text-primary"
                : "text-text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "part" && (
        <div className="mt-3">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Amount paid (of {formatNaira(total)})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0"
            className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
          />
        </div>
      )}

      {mode !== "paid" && (
        <div className="mt-3">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Customer name (who owes) — optional
          </label>
          <input
            value={debtorName}
            onChange={(e) => setDebtorName(e.target.value)}
            placeholder="e.g. Chidi"
            className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
