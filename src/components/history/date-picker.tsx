"use client";

import { useRouter } from "next/navigation";

export function HistoryDatePicker({ date }: { date: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={date}
      onChange={(e) => router.push(`/history?date=${e.target.value}`)}
      className="rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary focus:border-border-accent focus:outline-none"
    />
  );
}
