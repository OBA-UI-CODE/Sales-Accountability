import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/*
 * Downloads the shop's records as CSV — every sale, every debt, every
 * product, all read through the SIGNED-IN user's client so row-level
 * security decides what comes back.
 *
 * Useful on its own (opening the file in Excel is the fastest way to do
 * anything the app hasn't built a screen for), and specifically handy before
 * anyone considers wiping data — a shop's sales are its business records,
 * and someone may need them for tax long after they stop using this.
 */

export const dynamic = "force-dynamic";

/*
 * Escapes one CSV field per RFC 4180 (wrap in quotes, double any quote
 * inside), which keeps a debtor named "O'Brien & Sons", or a note with a
 * comma in it, from silently shifting every column after it one place left.
 *
 * The leading-apostrophe guard is for spreadsheets, not CSV: Excel treats a
 * field starting with =, +, - or @ as a FORMULA, so a customer name typed as
 * "=cmd|..." would otherwise become a live formula when the file is opened.
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvRows(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Not signed in", { status: 401 });
  }

  const [{ data: sales }, { data: staff }, { data: products }] =
    await Promise.all([
      supabase
        .from("sales")
        .select(
          "sold_at, custom_item_name, quantity, total_price, amount_paid, debtor_name, sold_by, edited_at, products(name,category), product_variants(label)",
        )
        .order("sold_at", { ascending: false }),
      supabase.from("profiles").select("id, name"),
      supabase
        .from("products")
        .select("name, category, default_price, stock_quantity")
        .is("archived_at", null),
    ]);

  const sellerName = new Map((staff ?? []).map((s) => [s.id, s.name]));

  const header = [
    "Date",
    "Item",
    "Size",
    "Category",
    "Quantity",
    "Total price",
    "Amount paid",
    "Balance owed",
    "Owed by",
    "Sold by",
    "Edited",
  ];

  const saleRows = (sales ?? []).map((s) => {
    const total = Number(s.total_price);
    const paid = Number(s.amount_paid);
    const product = s.products as unknown as { name: string; category: string } | null;
    const variant = s.product_variants as unknown as { label: string } | null;
    return [
      new Date(s.sold_at).toISOString().replace("T", " ").slice(0, 16),
      s.custom_item_name ?? product?.name ?? "Item",
      variant?.label ?? "",
      product?.category ?? "",
      s.quantity,
      total,
      paid,
      Math.max(0, total - paid),
      s.debtor_name ?? "",
      sellerName.get(s.sold_by) ?? "Staff",
      s.edited_at ? "yes" : "",
    ];
  });

  // Products go in the same file after a blank line and their own header —
  // one attachment is easier to keep hold of than two.
  const productHeader = ["Product", "Category", "Price", "Stock left"];
  const productRows = (products ?? []).map((p) => [
    p.name,
    p.category ?? "",
    Number(p.default_price),
    p.stock_quantity,
  ]);

  const csv =
    csvRows([header, ...saleRows]) +
    "\r\n\r\n" +
    csvRows([productHeader, ...productRows]) +
    "\r\n";

  // The BOM matters, not just decoration: without it, Excel on Windows reads
  // the file as the system codepage and every ₦ comes out as mojibake.
  const body = "﻿" + csv;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="salebook-records-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
