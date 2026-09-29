import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatNaira } from "@/lib/currency";

type ChartPoint = { label: string; total: number };
type TopItem = { name: string; quantity: number; total: number };

export function ReportSummary({
  total,
  collected,
  owed,
  count,
  change,
  chart,
  topItems,
  bestDay,
}: {
  total: number;
  collected: number;
  owed: number;
  count: number;
  change: number | null;
  chart: ChartPoint[];
  topItems: TopItem[];
  bestDay: ChartPoint | null;
}) {
  const max = Math.max(...chart.map((point) => point.total), 1);
  const TrendIcon = change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="min-w-0 grid gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total sales" value={formatNaira(total)} />
        <Metric label="Collected" value={formatNaira(collected)} tone="success" />
        <Metric label="Outstanding" value={formatNaira(owed)} tone={owed > 0 ? "warning" : undefined} />
        <Metric label="Transactions" value={String(count)} />
      </div>

      <div className="min-w-0 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-secondary">Sales performance</p>
              <p className="mt-1 text-xs text-text-muted">Revenue across the selected period</p>
            </div>
            <div className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${change !== null && change < 0 ? "bg-danger-bg text-danger-text" : "bg-success-bg text-success-text"}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {change === null ? "No prior data" : `${Math.abs(change).toFixed(1)}%`}
            </div>
          </div>
          <div className="flex h-52 w-full max-w-full items-end gap-2 overflow-x-auto overscroll-x-contain pb-1">
            {chart.map((point) => (
              <div key={point.label} className="flex min-w-10 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-text-muted">{point.total > 0 ? compactMoney(point.total) : ""}</span>
                <div className="flex h-36 w-full items-end rounded-lg bg-surface-input p-1">
                  <div
                    title={`${point.label}: ${formatNaira(point.total)}`}
                    className="w-full rounded-md bg-accent-blue transition-all"
                    style={{ height: `${point.total === 0 ? 0 : Math.max((point.total / max) * 100, 5)}%` }}
                  />
                </div>
                <span className="max-w-16 truncate text-[11px] text-text-secondary">{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-6">
          <p className="text-sm font-medium text-text-secondary">Top-selling items</p>
          <div className="mt-5 space-y-4">
            {topItems.length > 0 ? topItems.map((item, index) => (
              <div key={item.name} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-icon-circle-bg text-xs font-bold text-text-secondary">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.quantity} sold</p>
                </div>
                <span className="col-start-2 min-w-0 break-words text-sm font-medium text-text-primary sm:col-start-3 sm:row-start-1 sm:text-right">{formatNaira(item.total)}</span>
              </div>
            )) : <p className="text-sm text-text-muted">No items sold in this period.</p>}
          </div>
          {bestDay && (
            <div className="mt-6 border-t border-border-subtle pt-4">
              <p className="text-xs text-text-muted">Best day</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-text-primary">{bestDay.label}</p>
                <p className="min-w-0 break-words text-sm font-bold text-text-primary">{formatNaira(bestDay.total)}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success-text" : tone === "warning" ? "text-warning-text" : "text-text-primary";
  return (
    <div className="min-w-0 rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-5">
      <p className="text-xs text-text-muted sm:text-sm">{label}</p>
      <p className={`mt-2 min-w-0 break-words text-xl font-bold sm:text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
}
