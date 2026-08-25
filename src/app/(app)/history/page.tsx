import { createClient } from "@/lib/supabase/server";
import { getSalesForRange } from "@/lib/data/sales";
import { lagosDayRange, lagosToday, formatDateLagos } from "@/lib/date";
import { formatNaira } from "@/lib/currency";
import { HistoryDatePicker } from "@/components/history/date-picker";
import { HistoryList } from "@/components/history/history-list";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? lagosToday();

  const supabase = await createClient();
  const { startISO, endISO } = lagosDayRange(date);
  const sales = await getSalesForRange(supabase, startISO, endISO);
  const total = sales.reduce((sum, s) => sum + s.total_price, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-[32px] font-bold text-text-primary">
          Sales History
        </h1>
        <HistoryDatePicker date={date} />
      </div>

      <div className="rounded-2xl bg-surface-card p-6">
        <p className="text-sm text-text-secondary">{formatDateLagos(date)}</p>
        <p className="mt-2 text-3xl font-bold text-text-primary">
          {formatNaira(total)}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {sales.length} sale{sales.length === 1 ? "" : "s"}
        </p>
      </div>

      <HistoryList sales={sales} />
    </div>
  );
}
