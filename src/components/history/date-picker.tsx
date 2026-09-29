"use client";

import { useRouter } from "next/navigation";
import type { ReportPeriod } from "@/lib/date";

export function HistoryDatePicker({
  date,
  period,
}: {
  date: string;
  period: ReportPeriod;
}) {
  const router = useRouter();

  function navigate(nextPeriod: ReportPeriod, nextDate = date) {
    router.push(`/history?period=${nextPeriod}&date=${nextDate}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex rounded-[14px] border border-border-subtle bg-surface-input p-1">
        {(["day", "week", "month"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => navigate(option)}
            className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-medium capitalize transition-colors ${
              period === option
                ? "bg-accent-blue text-white"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => navigate(period, e.target.value)}
        className="rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary focus:border-border-accent focus:outline-none"
      />
    </div>
  );
}
