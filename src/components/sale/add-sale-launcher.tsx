"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddSaleModal } from "./add-sale-modal";

export function AddSaleLauncher({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop inline button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-accent-blue-strong md:flex"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Add Sale
      </button>

      {/* Mobile floating action button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add Sale"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue text-text-primary shadow-lg md:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {open && <AddSaleModal userId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}
