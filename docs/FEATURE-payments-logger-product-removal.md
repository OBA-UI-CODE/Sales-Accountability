# Feature spec — payment tracking, sale logger name, product removal

**For Claude Code to implement in VS Code against the running app.**

The **database side is already done and live** (migration
`0007_payments_and_product_removal.sql`, applied to Supabase). The
TypeScript types (`src/types/database.ts`) and a payment-status helper
(`src/lib/payment.ts`) are also updated. What remains is the **UI wiring**,
described below file by file.

Three features:
1. Show who logged each sale.
2. Payment tracking — Paid / Part-paid / Not paid, optional debtor name,
   dashboard collected/owed split, Debts page with record-payment.
3. Remove a product (smart archive-or-delete).

---

## What the database now provides

**New columns**
- `sales.amount_paid` (numeric, default 0; every existing sale was backfilled
  to fully paid). `sales.debtor_name` (text, nullable).
- `products.archived_at` (timestamptz, nullable). A product is "removed" from
  the app when this is set.

**Payment status is DERIVED, not stored.** Use the helpers in
`src/lib/payment.ts` (`paymentStatus`, `amountOwed`, `saleTotal`, `isDebt`,
`paymentBadge`) everywhere — do not re-implement the thresholds inline.

**RPC functions (call via `supabase.rpc(...)`)**
- `create_sale(p_product_id, p_custom_item_name, p_unit_price, p_quantity,
  p_sold_by, p_amount_paid?, p_debtor_name?)` — `p_amount_paid` defaults to the
  full total when omitted (so a normal fully-paid quick sale can still omit
  it). Clamped server-side to `[0, total]`.
- `update_sale(p_sale_id, p_product_id, p_custom_item_name, p_unit_price,
  p_quantity, p_amount_paid?, p_debtor_name?)` — omitting `p_amount_paid` keeps
  the existing paid amount (re-clamped to the new total).
- `record_payment(p_sale_id, p_amount?, p_pay_full?)` — pay down a debt. Pass
  `p_pay_full: true` to settle the whole balance ("Mark fully paid"), or
  `p_amount` to add a partial payment. Never overpays past the total.
- `remove_product(p_product_id)` — returns `'deleted'` (had no sales, hard
  deleted) or `'archived'` (had sales, hidden via `archived_at`).

All are `security definer` and granted to `authenticated`, so owner **or**
staff can call them — matching the product decisions (anyone can record
payments; anyone can remove products).

---

## Feature 1 — Show who logged each sale

**Files:** `src/components/sale/sale-list.tsx`,
`src/components/history/history-list.tsx` (and the dashboard sale list if
separate — `src/app/(app)/page.tsx`).

Each sale already has `sold_by` (a profile id). The list queries need to join
the seller's name and render it in the row, e.g.
`Attachments · ₦ 4,000 · Ada`.

- In the query that loads sales, select the seller's name via the FK, e.g.
  `.select("*, seller:profiles!sales_sold_by_fkey(name)")` and read
  `sale.seller?.name`. (Confirm the existing select shape in
  `src/lib/data/sales.ts` and extend it there so every sale list benefits.)
- Render the name subtly (muted text) after the price. Keep the row compact.

---

## Feature 2 — Payment tracking

### 2a. Add-sale form — `src/components/sale/add-sale-modal.tsx`
Add a payment section to the form:
- A 3-way selector: **Paid** (default) / **Part-paid** / **Not paid**.
- When **Part-paid**: show an "Amount paid" numeric input (must be `> 0` and
  `< total`).
- When **Not paid**: amount paid is 0 (no amount input needed).
- When **Part-paid** or **Not paid**: show an **optional** "Customer name
  (who owes)" text input → `debtor_name`.
- Compute `amount_paid` from the selection:
  - Paid → omit `p_amount_paid` (defaults to full) or pass the full total.
  - Part-paid → pass the entered amount.
  - Not paid → pass `0`.
- Pass `p_amount_paid` and `p_debtor_name` to the existing `create_sale`
  rpc call. Everything else about the form stays the same.

### 2b. Edit-sale form — `src/components/sale/edit-sale-modal.tsx`
Mirror the same payment controls, pre-filled from the sale's current
`amount_paid` / `debtor_name` (derive the selected radio via
`paymentStatus(sale)`). Pass `p_amount_paid` / `p_debtor_name` to `update_sale`.

### 2c. Sale rows — payment badge
In `sale-list.tsx` and `history-list.tsx`, use `paymentBadge(sale)` to render a
small pill after the amount: **Paid** (success/green), **Part-paid**
(warning/amber), **Not paid** (danger/red). For part-paid/unpaid rows, also
show the owed amount and debtor name when present, e.g.
`Owes ₦ 4,000 · Chidi` using `amountOwed(sale)` + `formatNaira`.

### 2d. Dashboard collected/owed split — `src/app/(app)/page.tsx`
Alongside the existing "today's total", show a split:
- **Collected** = sum of `amount_paid` for the day's sales.
- **Owed** = sum of `amountOwed(sale)` for the day's sales.
- Render like: `Today: ₦ 84,500 collected · ₦ 12,000 owed`. Keep the existing
  big total; add the split beneath it. If owed is 0, you can hide the owed
  half or show `· all paid`.

### 2e. Debts page — NEW `src/app/(app)/debts/page.tsx` + nav entry
A page listing every sale with an outstanding balance (`isDebt(sale)` /
`amount_paid < total`), newest first, across all dates (not just today).
Each row shows: item name, debtor name (or "No name"), total, amount paid,
**amount owed**, date, and who logged it. Two actions per row:
- **Record payment** → prompt for an amount → `record_payment(p_sale_id,
  p_amount)`.
- **Mark fully paid** → `record_payment(p_sale_id, null, true)`.
Rows drop off the list once fully paid (revalidate after each action).

Add a "Debts" entry to the nav. Nav lives in `src/lib/nav.ts` +
`src/components/nav/bottom-nav.tsx` + `src/components/nav/sidebar.tsx`; follow
the existing pattern (label, href `/debts`, an icon). A shop-relevant icon like
a wallet/receipt fits.

---

## Feature 3 — Remove a product

**Files:** `src/components/products/products-client.tsx`,
`src/components/products/product-modal.tsx`, and the products query.

- **Filter out archived products everywhere they're listed** — the products
  page and the add-sale product picker must only show products where
  `archived_at is null`. Add `.is("archived_at", null)` to those selects.
  (Old sales that reference a now-archived product still render fine because
  they read the joined product name.)
- Add a **Remove** action on each product row (next to Edit). On click, show a
  confirmation dialog: `Remove "<name>"? This can't be undone.` — matching the
  app's existing modal/confirah style (see `product-modal.tsx` /
  `restock-modal.tsx` for the pattern).
- On confirm → `supabase.rpc("remove_product", { p_product_id })`. The function
  decides delete-vs-archive automatically; the UI shows a toast/message using
  the returned value (`'deleted'` → "Product removed", `'archived'` → "Product
  removed (past sales kept)"). Revalidate the products list.
- Any signed-in user (owner or staff) can remove — no role gate needed.

---

## Testing checklist (in the running app)
- Log a fully-paid sale → shows **Paid**, no debt, seller name shown.
- Log a part-paid sale (₦6,000 of ₦10,000) with a name → shows **Part-paid**,
  "Owes ₦ 4,000 · <name>", appears on the Debts page and in today's "owed".
- Log a not-paid sale → **Not paid**, full amount owed.
- On Debts page: record a partial payment → owed drops, still listed; mark
  fully paid → disappears from Debts, row now shows **Paid**.
- Dashboard collected/owed totals match the day's sales.
- Add a product, then Remove it before any sale → it's gone (hard deleted).
- Remove a product that has sales → disappears from lists/picker, but its past
  sales still show the item name (archived, not deleted).
- Edit a sale's payment and confirm stock still adjusts correctly.
