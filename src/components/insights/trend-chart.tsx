import Link from "next/link";
import { formatNaira } from "@/lib/currency";

export interface TrendBar {
  key: string;
  label: string;
  title: string;
  total: number;
  sales: number;
  href: string;
}

export function TrendChart({ bars }: { bars: TrendBar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.total));
  const best = bars.reduce<TrendBar | null>((current, bar) => !current || bar.total > current.total ? bar : current, null);
  const showValues = bars.length <= 8;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex h-[180px] min-w-0 items-end gap-1.5 sm:gap-3" role="list">
        {bars.map((bar) => {
          const height = Math.max(bar.total > 0 ? 3 : 0, (bar.total / max) * 100);
          const isBest = best?.key === bar.key && bar.total > 0;
          return (
            <div key={bar.key} role="listitem" className="h-full min-w-0 flex-1">
              <Link href={bar.href} title={`${bar.title}: ${formatNaira(bar.total)}, ${bar.sales} sales`} aria-label={`${bar.title}: ${formatNaira(bar.total)}, ${bar.sales} sales`} className="flex h-full flex-col items-center justify-end gap-1 rounded-t transition hover:opacity-80">
                {showValues && bar.total > 0 && <span className="hidden whitespace-nowrap text-[11px] font-medium text-text-secondary sm:block">{formatNaira(bar.total)}</span>}
                <span className={`w-full rounded-t-[4px] ${isBest ? "bg-accent-blue" : "bg-accent-blue/45"}`} style={{ height: `${height}%`, minHeight: bar.total > 0 ? 4 : 0 }} />
              </Link>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 border-t border-border-subtle pt-2 sm:gap-3">
        {bars.map((bar) => <span key={bar.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-text-secondary sm:text-xs">{bar.label}</span>)}
      </div>
    </div>
  );
}
