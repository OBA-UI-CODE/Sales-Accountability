import { createClient } from "@/lib/supabase/server";
import { getSalesForRange } from "@/lib/data/sales";
import {
  lagosToday,
  lagosReportRange,
  formatDateLagos,
  formatShortDateLagos,
  type ReportPeriod,
} from "@/lib/date";
import { HistoryDatePicker } from "@/components/history/date-picker";
import { HistoryList } from "@/components/history/history-list";
import { ReportSummary } from "@/components/history/report-summary";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  const { date: dateParam, period: periodParam } = await searchParams;
  const date = dateParam ?? lagosToday();
  const period: ReportPeriod = periodParam === "week" || periodParam === "month" ? periodParam : "day";

  const supabase = await createClient();
  const range = lagosReportRange(date, period);
  const [sales, previousSales] = await Promise.all([
    getSalesForRange(supabase, range.startISO, range.endISO),
    getSalesForRange(supabase, range.previousStartISO, range.startISO),
  ]);
  const total = sales.reduce((sum, s) => sum + s.total_price, 0);
  const collected = sales.reduce((sum, s) => sum + s.amount_paid, 0);
  const owed = Math.max(total - collected, 0);
  const previousTotal = previousSales.reduce((sum, s) => sum + s.total_price, 0);
  const change = previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100;
  const chart = makeChart(sales, range.labelStart, range.labelEnd, period);
  const topItems = makeTopItems(sales);
  const bestDay = makeBestDay(sales);
  const periodLabel = period === "day"
    ? formatDateLagos(date)
    : `${formatShortDateLagos(range.labelStart)} – ${formatShortDateLagos(range.labelEnd)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-[32px] font-bold text-text-primary">
          Sales History
        </h1>
        <HistoryDatePicker date={date} period={period} />
      </div>

      <div>
        <p className="text-sm text-text-secondary">{periodLabel}</p>
        <h2 className="mt-1 text-xl font-semibold text-text-primary capitalize">{period} report</h2>
      </div>

      <ReportSummary
        total={total}
        collected={collected}
        owed={owed}
        count={sales.length}
        change={change}
        chart={chart}
        topItems={topItems}
        bestDay={bestDay}
      />

      <HistoryList sales={sales} />
    </div>
  );
}

type ReportSale = Awaited<ReturnType<typeof getSalesForRange>>[number];

function saleName(sale: ReportSale) {
  const base = sale.product?.name ?? sale.custom_item_name ?? "Custom item";
  return sale.variant?.label ? `${base} · ${sale.variant.label}` : base;
}

function lagosKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function makeChart(sales: ReportSale[], start: string, end: string, period: ReportPeriod) {
  if (period === "day") {
    return Array.from({ length: 6 }, (_, index) => {
      const startHour = index * 4;
      const total = sales
        .filter((sale) => {
          const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hourCycle: "h23" }).format(new Date(sale.sold_at)));
          return hour >= startHour && hour < startHour + 4;
        })
        .reduce((sum, sale) => sum + sale.total_price, 0);
      return { label: `${String(startHour).padStart(2, "0")}:00`, total };
    });
  }

  const startDate = new Date(`${start}T00:00:00+01:00`);
  const endDate = new Date(`${end}T00:00:00+01:00`);
  const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  const groupSize = period === "month" && dayCount > 16 ? 7 : 1;
  const points = [];
  for (let offset = 0; offset < dayCount; offset += groupSize) {
    const groupStart = new Date(startDate.getTime() + offset * 86_400_000);
    const groupEnd = new Date(startDate.getTime() + Math.min(offset + groupSize, dayCount) * 86_400_000);
    const total = sales.filter((sale) => {
      const time = new Date(`${lagosKey(sale.sold_at)}T00:00:00+01:00`).getTime();
      return time >= groupStart.getTime() && time < groupEnd.getTime();
    }).reduce((sum, sale) => sum + sale.total_price, 0);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric" }).format(groupStart);
    points.push({ label, total });
  }
  return points;
}

function makeTopItems(sales: ReportSale[]) {
  const items = new Map<string, { name: string; quantity: number; total: number }>();
  for (const sale of sales) {
    const name = saleName(sale);
    const current = items.get(name) ?? { name, quantity: 0, total: 0 };
    current.quantity += sale.quantity;
    current.total += sale.total_price;
    items.set(name, current);
  }
  return [...items.values()].sort((a, b) => b.total - a.total).slice(0, 3);
}

function makeBestDay(sales: ReportSale[]) {
  if (sales.length === 0) return null;
  const totals = new Map<string, number>();
  for (const sale of sales) {
    const key = lagosKey(sale.sold_at);
    totals.set(key, (totals.get(key) ?? 0) + sale.total_price);
  }
  const [date, total] = [...totals.entries()].reduce((best, current) => current[1] > best[1] ? current : best);
  return { label: formatShortDateLagos(date), total };
}
