import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

/** Up/down vs-yesterday pill — green on the way up, amber on the way down. */
export function ChangePill({
  direction,
  value,
  note,
}: {
  direction: "up" | "down";
  value: string;
  note?: string;
}) {
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
      <Icon
        className={`h-3 w-3 ${direction === "up" ? "text-success-text" : "text-warning-text"}`}
      />
      <span className={direction === "up" ? "text-success-text" : "text-warning-text"}>
        {value}
      </span>
      {note && <span className="font-normal text-text-muted">{note}</span>}
    </span>
  );
}

/** Overlapping initials circles — who's logged a sale today, at a glance. */
export function AvatarStack({ names }: { names: string[] }) {
  const shown = names.slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <div
          key={`${n}-${i}`}
          style={{ marginLeft: i === 0 ? 0 : -8 }}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-card bg-icon-circle-bg"
        >
          <span className="text-[9px] font-semibold text-text-primary">{n}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatCard({
  label,
  icon: Icon,
  value,
  sub,
  footer,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  sub?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <Icon className="h-4 w-4 text-text-muted" strokeWidth={2} />
      </div>
      <p className="text-[28px] font-bold leading-none text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
      {footer && <div className="mt-auto flex items-center justify-between gap-3 pt-1">{footer}</div>}
    </div>
  );
}
