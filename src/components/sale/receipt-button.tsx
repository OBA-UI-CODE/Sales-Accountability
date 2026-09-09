"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

/*
 * Gets the receipt for a sale and hands it to the customer.
 *
 * On a phone this opens the system share sheet, so the receipt goes
 * straight into a WhatsApp chat. Where sharing a file isn't supported, it
 * falls back to a normal download.
 *
 * The image is fetched rather than linked — a plain <a download> can't feed
 * the share sheet, and on iOS tends to open the image in a new tab instead
 * of saving it. Fetching gives both paths a Blob to work from.
 */
export function ReceiptButton({
  saleId,
  label = "Receipt",
  className = "",
}: {
  saleId: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/receipt/${saleId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], `receipt-${saleId.slice(0, 8)}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Receipt" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // AbortError means the person opened the share sheet and changed
      // their mind — not a failure, so it's not shouted about.
      if ((e as Error)?.name !== "AbortError") {
        setError("Couldn't make that receipt. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary transition hover:bg-surface-elevated disabled:opacity-50 ${className}`}
      >
        <Receipt className="h-3.5 w-3.5" />
        {busy ? "Preparing..." : label}
      </button>
      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
