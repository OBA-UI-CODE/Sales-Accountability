import Link from "next/link";
import { Coins, BarChart3, ShoppingCart, PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSalesForRange } from "@/lib/data/sales";
import { lagosDayRange, lagosToday } from "@/lib/date";
import { formatNaira, initials, pctChange } from "@/lib/currency";
import { amountOwed } from "@/lib/payment";
import { SaleList } from "@/components/sale/sale-list";
import { AddSaleLauncher } from "@/components/sale/add-sale-launcher";
import StatCard, { AvatarStack, ChangePill } from "@/components/dashboard/stat-card";

/*
 * Time-of-day greeting headline. The prefix ("Good morning") and the
 * headline itself both switch together so they never look mismatched —
 * computed in Africa/Lagos, matching every other "today" boundary in the app.
 */
function greetingParts(): { prefix: string; headline: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(new Date()),
  );

  if (hour >= 5 && hour < 12) {
    return { prefix: "Good morning", headline: "How market today." };
  }
  if (hour >= 12 && hour < 18) {
    return { prefix: "Good afternoon", headline: "Sales dey alright?" };
  }
  return { prefix: "Good evening", headline: "How much we make today?" };
}

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

  const yesterday = new Date(startISO);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yStart = yesterday.toISOString();

  // Run every independent read together — four network round trips awaited
  // in sequence would cost roughly four times the latency on every load.
  const [sales, yesterdaySales, lowStockProducts, lowStockVariants] =
    await Promise.all([
      getSalesForRange(supabase, startISO, endISO),
      getSalesForRange(supabase, yStart, startISO),
      supabase
        .from("products")
        .select("stock_quantity, low_stock_threshold")
        .is("archived_at", null),
      supabase
        .from("product_variants")
        .select("stock_quantity, low_stock_threshold")
        .is("archived_at", null),
    ]);

  const totalToday = sales.reduce((sum, s) => sum + s.total_price, 0);
  const collectedToday = sales.reduce((sum, s) => sum + s.amount_paid, 0);
  const owedToday = sales.reduce((sum, s) => sum + amountOwed(s), 0);
  const countToday = sales.length;
  const avgSale = countToday ? totalToday / countToday : 0;

  const totalYesterday = yesterdaySales.reduce((sum, s) => sum + s.total_price, 0);
  const countYesterday = yesterdaySales.length;
  const avgYesterday = countYesterday ? totalYesterday / countYesterday : 0;
  const countDelta = countToday - countYesterday;

  const lowStockCount =
    (lowStockProducts.data ?? []).filter(
      (p) => p.stock_quantity <= p.low_stock_threshold,
    ).length +
    (lowStockVariants.data ?? []).filter(
      (v) => v.stock_quantity <= v.low_stock_threshold,
    ).length;

  const sellerNames = [
    ...new Set(sales.map((s) => s.seller?.name).filter((n): n is string => !!n)),
  ];

  const { prefix, headline } = greetingParts();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {prefix}, {profile?.name?.split(" ")[0] ?? "there"}
          </p>
          <h1 className="mt-1 text-[36px] font-bold leading-none text-text-primary md:text-[44px]">
            {headline}
          </h1>
        </div>
        {user && <AddSaleLauncher userId={user.id} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's sales"
          icon={Coins}
          value={formatNaira(totalToday)}
          sub={
            owedToday > 0
              ? `${formatNaira(collectedToday)} collected · ${formatNaira(owedToday)} owed`
              : `${formatNaira(collectedToday)} collected · all paid`
          }
          footer={
            <ChangePill
              direction={totalToday >= totalYesterday ? "up" : "down"}
              value={pctChange(totalToday, totalYesterday)}
              note="vs yesterday"
            />
          }
        />

        <StatCard
          label="Sales logged"
          icon={BarChart3}
          value={String(countToday)}
          sub={`by ${sellerNames.length} staff member${sellerNames.length === 1 ? "" : "s"}`}
          footer={
            <>
              <ChangePill
                direction={countDelta >= 0 ? "up" : "down"}
                value={`${countDelta >= 0 ? "+" : ""}${countDelta}`}
                note="vs yesterday"
              />
              <AvatarStack names={sellerNames.map(initials)} />
            </>
          }
        />

        <StatCard
          label="Average sale"
          icon={ShoppingCart}
          value={formatNaira(avgSale)}
          sub="Per transaction"
          footer={
            <ChangePill
              direction={avgSale >= avgYesterday ? "up" : "down"}
              value={pctChange(avgSale, avgYesterday)}
              note="vs yesterday"
            />
          }
        />

        <StatCard
          label="Low stock"
          icon={PackageX}
          value={String(lowStockCount)}
          sub={
            lowStockCount === 0
              ? "Everything's well stocked"
              : `item${lowStockCount === 1 ? "" : "s"} need restock soon`
          }
          footer={
            <Link href="/products" className="text-[11px] font-semibold text-accent-blue">
              View products →
            </Link>
          }
        />
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
