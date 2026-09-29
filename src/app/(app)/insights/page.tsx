import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/currency";
import { lagosToday } from "@/lib/date";
import { TrendChart, type TrendBar } from "@/components/insights/trend-chart";
import type { Product, ProductVariant, SaleWithRelations } from "@/types/database";

type Range = "7d" | "weeks" | "months";
type ItemInsight = { name: string; stock: number; price: number; sold14: number; lastSold: string | null; createdAt: string };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: Range = params.range === "weeks" || params.range === "months" ? params.range : "7d";
  const supabase = await createClient();
  const today = lagosToday();
  const tomorrow = addDays(today, 1);
  const yearStart = addMonths(monthStart(today), -11);

  const [sales, productsResult, variantsResult] = await Promise.all([
    getSalesSince(supabase, yearStart),
    supabase.from("products").select("*").is("archived_at", null).order("name"),
    supabase.from("product_variants").select("*").is("archived_at", null).order("price"),
  ]);
  const products = productsResult.data ?? [];
  const variants = variantsResult.data ?? [];

  const { bars, headline, rangeLabel, compare } = makeTrend(sales, range, today, tomorrow);
  const last30 = sales.filter((sale) => sale.sold_at >= lagosIso(addDays(today, -29)));
  const typedCount = last30.filter((sale) => !sale.product_id).length;
  const mostlyTyped = typedCount >= 3 && typedCount / Math.max(1, last30.length) >= 0.3;
  const topItems = makeTopItems(last30);
  const topMax = Math.max(1, ...topItems.map((item) => item.revenue));
  const inventory = makeInventoryInsights(products, variants, sales, today);
  const soon = inventory.filter((item) => item.sold14 > 0 && item.stock / (item.sold14 / 14) <= 7).sort((a, b) => a.stock / a.sold14 - b.stock / b.sold14);
  const staleThreshold = lagosIso(addDays(today, -29));
  const stale = inventory.filter((item) => item.stock > 0 && item.createdAt < staleThreshold && (!item.lastSold || item.lastSold < staleThreshold)).sort((a, b) => b.stock * b.price - a.stock * a.price);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold text-text-primary">Insights</h1>
        <p className="text-sm text-text-secondary">What is selling, what needs restocking, and how T-Max Store is doing.</p>
      </div>

      {mostlyTyped && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border-accent bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">{typedCount} of your {last30.length} sales in the last 30 days were typed by hand. Add those items to Products so Insights can track their stock and warn you before they run out.</p>
          <Link href="/products" className="flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-blue px-5 text-sm font-semibold text-white">Go to products</Link>
        </div>
      )}

      <Card title="Sales trend">
        <nav aria-label="Insight range" className="flex gap-1 rounded-[10px] bg-surface-base p-1 sm:self-start">
          <RangeTab range="7d" current={range}>7 days</RangeTab>
          <RangeTab range="weeks" current={range}>8 weeks</RangeTab>
          <RangeTab range="months" current={range}>12 months</RangeTab>
        </nav>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="min-w-0 break-words text-[32px] font-semibold text-text-primary">{formatNaira(headline.total)}</span>
          <span className="text-sm text-text-secondary">{rangeLabel} · {headline.sales} {headline.sales === 1 ? "sale" : "sales"}</span>
          {compare && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${compare.pct === null ? "bg-surface-base text-text-secondary" : compare.pct >= 0 ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"}`}>{compare.pct === null ? "No earlier sales to compare" : `${compare.pct >= 0 ? "Up" : "Down"} ${Math.abs(compare.pct)}% on the 7 days before`}</span>}
        </div>
        <TrendChart bars={bars} />
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Top sellers" note="Last 30 days, by money brought in">
          {topItems.length === 0 ? <Empty>No sales in the last 30 days yet. Your best sellers will show here.</Empty> : (
            <ol className="flex min-w-0 flex-col gap-3">
              {topItems.map((item, index) => (
                <li key={item.name} className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex min-w-0 items-baseline justify-between gap-3"><span className="min-w-0 truncate font-semibold text-text-primary">{index + 1}. {item.name}</span><span className="shrink-0 font-semibold text-text-primary">{formatNaira(item.revenue)}</span></div>
                  <div className="flex items-center gap-3"><span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-base"><span className="absolute inset-y-0 left-0 rounded-full bg-accent-blue" style={{ width: `${(item.revenue / topMax) * 100}%` }} /></span><span className="shrink-0 text-xs text-text-secondary">{item.quantity} sold</span></div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Running out soon" note="How fast each item sells, against the stock you have">
          {soon.length === 0 ? <Empty>Nothing is about to run out. Fast-selling items with low stock will show here about a week ahead.</Empty> : (
            <ul className="flex min-w-0 flex-col divide-y divide-border-subtle">
              {soon.map((item) => {
                const perDay = item.sold14 / 14;
                const daysLeft = item.stock / perDay;
                return <li key={item.name} className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary">{item.name}</span><span className="text-sm text-text-secondary">Sells about {perDay >= 1 ? Math.round(perDay) : perDay.toFixed(1)} a day · {item.stock <= 0 ? "none" : item.stock} left</span></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.stock <= 0 || daysLeft < 2 ? "bg-danger-bg text-danger-text" : "bg-warning-bg text-warning-text"}`}>{item.stock <= 0 ? "Out of stock" : daysPhrase(daysLeft)}</span></li>;
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Not selling" note="Items with stock that have not sold in the last 30 days">
        {stale.length === 0 ? <Empty>Everything with stock has sold at least once in the last 30 days.</Empty> : (
          <>
            <ul className="flex min-w-0 flex-col divide-y divide-border-subtle">
              {stale.map((item) => <li key={item.name} className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary">{item.name}</span><span className="text-sm text-text-secondary">{item.stock} in stock · {item.lastSold ? `last sold ${formatShort(item.lastSold)}` : "never sold"}</span></div><span className="shrink-0 text-right text-sm font-semibold text-text-primary">{formatNaira(item.stock * item.price)}<span className="block text-xs font-normal text-text-secondary">tied up</span></span></li>)}
            </ul>
            <p className="text-sm text-text-secondary">Consider a discount to free up the money, or stop restocking the item. Removing it from Products keeps all past sales.</p>
          </>
        )}
      </Card>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[14px] bg-surface-card p-5 sm:p-6"><div className="flex flex-col gap-1"><h2 className="text-xl font-semibold text-text-primary">{title}</h2>{note && <p className="text-sm text-text-secondary">{note}</p>}</div>{children}</section>;
}

function RangeTab({ range, current, children }: { range: Range; current: Range; children: React.ReactNode }) {
  return <Link href={`/insights?range=${range}`} aria-current={range === current ? "page" : undefined} className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-[8px] px-3 text-sm font-semibold transition sm:flex-none sm:px-5 ${range === current ? "bg-accent-blue text-white" : "text-text-secondary hover:text-text-primary"}`}>{children}</Link>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-text-secondary">{children}</p>;
}

async function getSalesSince(supabase: Awaited<ReturnType<typeof createClient>>, fromYmd: string) {
  const rows: SaleWithRelations[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("sales").select("*, product:products(id,name,category), variant:product_variants(id,label), seller:profiles(id,name)").gte("sold_at", lagosIso(fromYmd)).order("sold_at").range(from, from + 999);
    if (error || !data) break;
    rows.push(...(data as unknown as SaleWithRelations[]));
    if (data.length < 1000) break;
  }
  return rows;
}

function makeTrend(sales: SaleWithRelations[], range: Range, today: string, tomorrow: string) {
  let starts: string[];
  let rangeLabel: string;
  if (range === "7d") {
    const first = addDays(today, -6);
    starts = Array.from({ length: 7 }, (_, index) => addDays(first, index));
    rangeLabel = "Last 7 days";
  } else if (range === "weeks") {
    const first = addDays(weekStart(today), -49);
    starts = Array.from({ length: 8 }, (_, index) => addDays(first, index * 7));
    rangeLabel = "Last 8 weeks";
  } else {
    const first = addMonths(monthStart(today), -11);
    starts = Array.from({ length: 12 }, (_, index) => addMonths(first, index));
    rangeLabel = "Last 12 months";
  }
  const bars: TrendBar[] = starts.map((start, index) => {
    const end = range === "7d" ? addDays(start, 1) : range === "weeks" ? addDays(start, 7) : addMonths(start, 1);
    const rows = sales.filter((sale) => sale.sold_at >= lagosIso(start) && sale.sold_at < lagosIso(end));
    const date = range === "7d" ? start : start;
    return { key: start, label: range === "7d" ? (index === starts.length - 1 ? "Today" : formatDate(start, { weekday: "short" })) : range === "weeks" ? (index === starts.length - 1 ? "This wk" : formatDate(start, { day: "numeric", month: "short" })) : formatDate(start, { month: "short" }), title: formatDate(start, { day: "numeric", month: "long", year: "numeric" }), total: rows.reduce((sum, sale) => sum + sale.total_price, 0), sales: rows.length, href: `/history?period=${range === "7d" ? "day" : range === "weeks" ? "week" : "month"}&date=${date}` };
  });
  const headline = { total: bars.reduce((sum, bar) => sum + bar.total, 0), sales: bars.reduce((sum, bar) => sum + bar.sales, 0) };
  let compare: { pct: number | null } | null = null;
  if (range === "7d") {
    const currentStart = addDays(today, -6);
    const previousTotal = sales.filter((sale) => sale.sold_at >= lagosIso(addDays(today, -13)) && sale.sold_at < lagosIso(currentStart)).reduce((sum, sale) => sum + sale.total_price, 0);
    compare = { pct: previousTotal > 0 ? Math.round(((headline.total - previousTotal) / previousTotal) * 100) : null };
  }
  return { bars, headline, rangeLabel, compare, tomorrow };
}

function makeTopItems(sales: SaleWithRelations[]) {
  const items = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const sale of sales) {
    const name = itemName(sale);
    const current = items.get(name) ?? { name, quantity: 0, revenue: 0 };
    current.quantity += sale.quantity;
    current.revenue += sale.total_price;
    items.set(name, current);
  }
  return [...items.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

function makeInventoryInsights(products: Product[], variants: ProductVariant[], sales: SaleWithRelations[], today: string): ItemInsight[] {
  const since14 = lagosIso(addDays(today, -13));
  const items: ItemInsight[] = [];
  for (const product of products) {
    const productVariants = variants.filter((variant) => variant.product_id === product.id);
    const candidates = productVariants.length > 0 ? productVariants.map((variant) => ({ id: variant.id, name: `${product.name} · ${variant.label}`, stock: variant.stock_quantity, price: variant.price, variant: true, createdAt: variant.created_at })) : [{ id: product.id, name: product.name, stock: product.stock_quantity, price: product.default_price, variant: false, createdAt: product.created_at }];
    for (const candidate of candidates) {
      const related = sales.filter((sale) => candidate.variant ? sale.variant_id === candidate.id : sale.product_id === candidate.id && !sale.variant_id);
      items.push({ name: candidate.name, stock: candidate.stock, price: candidate.price, sold14: related.filter((sale) => sale.sold_at >= since14).reduce((sum, sale) => sum + sale.quantity, 0), lastSold: related.at(-1)?.sold_at ?? null, createdAt: candidate.createdAt });
    }
  }
  return items;
}

function itemName(sale: SaleWithRelations) {
  const base = sale.product?.name ?? sale.custom_item_name ?? "Custom item";
  return sale.variant?.label ? `${base} · ${sale.variant.label}` : base;
}

function lagosIso(ymd: string) { return new Date(`${ymd}T00:00:00+01:00`).toISOString(); }
function addDays(ymd: string, days: number) { const date = new Date(lagosIso(ymd)); date.setUTCDate(date.getUTCDate() + days); return dateKey(date); }
function monthStart(ymd: string) { return `${ymd.slice(0, 7)}-01`; }
function addMonths(ymd: string, months: number) { const [year, month] = ymd.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1 + months, 15)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`; }
function weekStart(ymd: string) { const date = new Date(lagosIso(ymd)); const offset = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - offset); return dateKey(date); }
function dateKey(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function formatDate(ymd: string, options: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", ...options }).format(new Date(`${ymd}T12:00:00+01:00`)); }
function formatShort(iso: string) { return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", day: "numeric", month: "short" }).format(new Date(iso)); }
function daysPhrase(days: number) { return days < 1 ? "less than a day" : days < 1.5 ? "about 1 day" : `about ${Math.round(days)} days`; }
