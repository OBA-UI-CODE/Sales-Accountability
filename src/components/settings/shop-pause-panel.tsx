"use client";

import { useState, useTransition } from "react";
import { PauseCircle } from "lucide-react";
import { pauseShop } from "@/app/(app)/settings/shop-actions";

export function ShopPausePanel() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl bg-surface-card p-6">
      <h3 className="mb-2 text-sm font-bold text-text-primary">
        Pause this shop
      </h3>
      <p className="mb-4 text-xs text-text-muted">
        Signs everyone out and stops anyone using SaleBook until you reopen
        it. Every sale, product and debt stays exactly as it is.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:bg-surface-elevated"
        >
          <PauseCircle className="h-3.5 w-3.5" />
          Pause my shop
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-[10px] bg-danger-bg px-3 py-2 text-xs text-danger-text">
            Sure? You and your staff will be signed out until you reopen it
            from this same screen.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="flex-1 rounded-xl border border-border-subtle py-2.5 text-xs font-semibold text-text-secondary disabled:opacity-40"
            >
              Keep it open
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => pauseShop())}
              className="flex-1 rounded-xl bg-danger-bg py-2.5 text-xs font-semibold text-danger-text disabled:opacity-40"
            >
              {pending ? "Pausing..." : "Yes, pause my shop"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
