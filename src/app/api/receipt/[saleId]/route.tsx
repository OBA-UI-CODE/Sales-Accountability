import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

/*
 * A receipt for one sale, as a PNG.
 *
 * An IMAGE, not a PDF, on purpose — shop owners send things on WhatsApp,
 * where an image appears in the chat and a PDF is a download the customer
 * has to find and open first.
 *
 * A RECEIPT, and never an invoice — no sequential numbering, no tax ID, no
 * VAT line, and the word "invoice" never appears. A slip that looks like a
 * tax document could lead a shop owner to believe they're VAT-compliant
 * when they're not.
 *
 * Read with the SIGNED-IN user's client, so row-level security decides what
 * comes back — the id in the URL is not trusted for anything beyond that.
 */

export const dynamic = "force-dynamic";

const money = (n: number) =>
  "NGN " + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const { saleId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Not signed in", { status: 401 });
  }

  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, custom_item_name, quantity, total_price, amount_paid, debtor_name, sold_at, edited_at, sold_by, products(name,category), product_variants(label)",
    )
    .eq("id", saleId)
    .maybeSingle();

  if (!sale) {
    return new Response("Not found", { status: 404 });
  }

  const { data: seller } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", sale.sold_by)
    .maybeSingle();

  const product = sale.products as unknown as {
    name: string;
    category: string;
  } | null;
  const variant = sale.product_variants as unknown as {
    label: string;
  } | null;

  const item = sale.custom_item_name ?? product?.name ?? "Item";
  const size = variant?.label;

  const total = Number(sale.total_price);
  const paid = Number(sale.amount_paid);
  const balance = Math.max(0, total - paid);

  const when = new Date(sale.sold_at).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // A short reference, not a sequential number — the first 8 characters of
  // the sale's id are enough to tell two receipts apart, without implying
  // sequential guarantees this app doesn't make.
  const reference = sale.id.slice(0, 8).toUpperCase();

  const ACCENT = "#3d7dff";

  const Row = ({
    label,
    value,
    strong = false,
    color = "#1a1a1a",
  }: {
    label: string;
    value: string;
    strong?: boolean;
    color?: string;
  }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        width: "100%",
        fontSize: strong ? 34 : 27,
        fontWeight: strong ? 700 : 400,
        color,
        marginBottom: 16,
      }}
    >
      <span style={{ color: strong ? color : "#6b6b6b" }}>{label}</span>
      <span>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: "56px 56px 40px",
          color: "#1a1a1a",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 26 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            T-Max Store
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: `3px solid ${ACCENT}`,
            paddingBottom: 18,
            marginBottom: 30,
          }}
        >
          <span style={{ fontSize: 30, letterSpacing: 3, color: ACCENT, fontWeight: 700 }}>
            RECEIPT
          </span>
          <span style={{ fontSize: 24, color: "#6b6b6b" }}>{`No. ${reference}`}</span>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#6b6b6b", marginBottom: 28 }}>
          {when}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
            {`${item}${size ? ` · ${size}` : ""}`}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#6b6b6b", marginTop: 8 }}>
            {`Quantity: ${sale.quantity}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid #e2e2e2", paddingTop: 26 }}>
          <Row label="Total" value={money(total)} />
          <Row label="Paid" value={money(paid)} />
          {balance > 0 ? (
            <Row label="Balance owing" value={money(balance)} strong color="#b3261e" />
          ) : (
            <Row label="Status" value="Paid in full" strong color="#158060" />
          )}
        </div>

        {balance > 0 && sale.debtor_name ? (
          <div style={{ display: "flex", fontSize: 25, color: "#6b6b6b", marginTop: 4 }}>
            {`Owed by ${sale.debtor_name}`}
          </div>
        ) : null}

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "2px solid #e2e2e2",
            paddingTop: 22,
            fontSize: 23,
            color: "#8a8a8a",
          }}
        >
          <span>
            {`Served by ${seller?.name ?? "Staff"}${sale.edited_at ? " · amended" : ""}`}
          </span>
          <span style={{ color: ACCENT, fontWeight: 700, letterSpacing: 2 }}>
            SaleBook
          </span>
        </div>
      </div>
    ),
    { width: 820, height: 900 },
  );
}
