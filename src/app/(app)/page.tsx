import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSalesForRange } from "@/lib/data/sales";
import { lagosDayRange, lagosToday } from "@/lib/date";
import { formatNaira } from "@/lib/currency";
import { amountOwed } from "@/lib/payment";
import { SaleList } from "@/components/sale/sale-list";
import { AddSaleLauncher } from "@/components/sale/add-sale-launcher";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const today = lagosToday();
  const { startISO, endISO } = lagosDayRange(today);
  const sales = await getSalesForRange(supabase, startISO, endISO);

  const yesterday = new Date(startISO);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const { startISO: yStart, endISO: yEnd } = {
    startISO: yesterday.toISOString(),
    endISO: startISO,
  };
  const yesterdaySales = await getSalesForRange(supabase, yStart, yEnd);

  const totalToday = sales.reduce((sum, s) => sum + s.total_price, 0);
  const collectedToday = sales.reduce((sum, s) => sum + s.amount_paid, 0);
  const owedToday = sales.reduce((sum, s) => sum + amountOwed(s), 0);
  const countToday = sales.length;
  const avgSale = countToday ? totalToday / countToday : 0;
  const countDelta = countToday - yesterdaySales.length;

  const hour = new Date().getUTCHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {greeting}, {profile?.name ?? "there"}
          </p>
          <h1 className="mt-1 text-[44px] font-bold leading-none text-text-primary">
            Dashboard
          </h1>
        </div>
        {user && <AddSaleLauncher userId={user.id} />}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-surface-card p-6 md:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-blue" />
            <span className="text-xs text-text-secondary">
              Today &middot; SaleBook
            </span>
          </div>
          <p className="text-[48px] font-bold leading-none text-text-primary">
            {formatNaira(totalToday)}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {formatNaira(collectedToday)} collected
            {owedToday > 0
              ? ` · ${formatNaira(owedToday)} owed`
              : " · all paid"}
          </p>
          <p className="mt-3 text-sm text-text-muted">
            {countToday} sale{countToday === 1 ? "" : "s"} logged today
          </p>
        </div>

        <div className="rounded-2xl bg-surface-card p-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Sales Today
          </p>
          <p className="mt-2 text-3xl font-bold text-text-primary">
            {countToday}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {countDelta === 0
              ? "same as yesterday"
              : `${countDelta > 0 ? "+" : ""}${countDelta} vs yesterday`}
          </p>
        </div>

        <div className="rounded-2xl bg-surface-card p-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Avg. Sale
          </p>
          <p className="mt-2 text-3xl font-bold text-text-primary">
            {formatNaira(avgSale)}
          </p>
          <p className="mt-1 text-xs text-text-muted">per transaction</p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            Today&apos;s Sales
          </h2>
          <Link
            href="/history"
            className="text-sm font-semibold text-accent-blue"
          >
            See all
          </Link>
        </div>
        <SaleList
          sales={sales}
          emptyMessage="No sales logged today yet. Tap Add Sale to log the first one."
        />
      </div>
    </div>
  );
}
