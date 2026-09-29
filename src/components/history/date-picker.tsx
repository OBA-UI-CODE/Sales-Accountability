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
    <div className="flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
      <div className="flex w-full min-w-0 rounded-[14px] border border-border-subtle bg-surface-input p-1 sm:w-auto">
        {(["day", "week", "month"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => navigate(option)}
            className={`min-w-0 flex-1 rounded-[10px] px-3 py-2 text-sm font-medium capitalize transition-colors sm:px-4 ${
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
        className="min-w-0 w-full max-w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary focus:border-border-accent focus:outline-none sm:w-auto"
      />
    </div>
  );
}
