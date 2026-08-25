# Product Requirements Document

**Product name (working title):** SaleBook
**Author:** Oba
**Date:** August 25, 2026
**Status:** Draft v1 — pending review of UI visuals

---

## 1. Background & Problem Statement

Oba's mom runs a small shop selling hair attachments/weave-ons and cosmetics. Every sale is currently recorded by hand in a notebook: what the customer bought and how much they paid. At the end of the day, she has to manually add everything up to know her total sales.

This is slow, error-prone, and makes it hard to answer simple questions later — "how much did I make last Tuesday?", "how many bundles of X do I have left?", "did I already record that sale?"

The goal is a simple web app that replaces the notebook: fast enough to use with a customer standing at the counter, but structured enough to give her totals, history, and basic stock tracking without any manual arithmetic.

**Guiding principle for this whole document: keep it simple.** Every feature below is there because it directly replaces something the notebook does today, or fixes a real pain point of the notebook. Nothing is included "because it'd be nice" — those ideas are parked in the Phase 2 section instead.

---

## 2. Goals

- Let her record a sale (item + price) in a few taps, as fast as writing it in the book — faster, ideally.
- Automatically show the running total for today, with no manual addition.
- Keep a searchable history of past sales by date.
- Track basic stock levels per product, so she can see what's running low.
- Support more than one person logging sales (e.g., her and a shop assistant), with each sale attributed to who logged it.
- Allow correcting mistakes (wrong price, wrong item) after the fact.
- Work well on a phone, since that's most likely what's behind the counter.

## 3. Non-Goals (out of scope for v1)

- No accounting/tax/profit-margin calculations.
- No online storefront, e-commerce, or customer-facing catalog.
- No payment processing or POS card integration — this only *records* sales, it doesn't process payment.
- No barcode scanning.
- No multi-shop/multi-branch support.
- No offline mode (requires an internet connection — see Section 9 for the tradeoff).

---

## 4. Users

**Primary user — Shop Owner (Mom).** Runs the shop day to day, logs most sales, needs to see totals and manage the product list/stock. Not deeply technical — the app has to be obvious with zero training.

**Secondary user — Shop Assistant/Staff.** Occasionally logs sales when covering the shop. Needs the same fast sale-entry screen, but doesn't necessarily need to manage products or see full history.

Both are handled by one simple user account system with a role flag (owner vs. staff) — see Section 6.5.

---

## 5. Core User Stories

1. As the shop owner, when a customer buys an attachment for ₦4,500, I want to log it in a few taps so I can move on to the next customer.
2. As the shop owner, I want to see today's total sales at a glance without adding anything up myself.
3. As the shop owner, I want to look back at any past date and see exactly what was sold and for how much.
4. As the shop owner, I want to see how much stock I have left of each product, so I know when to restock.
5. As the shop owner, I want to fix a sale I logged wrong (typo'd price, picked the wrong item) without deleting my whole day's record.
6. As a shop assistant, I want to log a sale quickly, the same way the owner does, without needing to manage the product catalog.
7. As the shop owner, I want to know who logged which sale, in case I need to double check something with staff later.

---

## 6. Core Features (v1 / MVP)

### 6.1 Quick Sale Entry
The heart of the app — this replaces the notebook.

- A single, prominent "Add Sale" action, always one tap away from the home screen.
- Select a product from the existing catalog (searchable list, e.g. type "attach" to find "Attachment - Straight 24in"), **or** enter a one-off custom item name if it's something not in the catalog yet (e.g. a rare item she doesn't want to formally add to inventory).
- Enter/confirm price (pre-filled from the product's default price if selected from catalog, editable in case she's negotiated a different price).
- Enter quantity (defaults to 1).
- Total for that line is calculated automatically (price × quantity).
- One tap to save. Confirmation is instant and lightweight (no full-page reload, no multi-step wizard).
- If the item was selected from the catalog, stock is automatically reduced by the quantity sold.

### 6.2 Today's Total (Dashboard/Home)
- The home screen, the moment she opens the app, shows: **today's total sales (₦)** and **number of sales logged today**, front and center.
- Below that, a running list of today's sales in reverse chronological order (most recent first), each showing item, price, quantity, time, and who logged it.
- The "Add Sale" button lives on this same screen so she never has to navigate to log a sale.

### 6.3 Sales History
- A calendar or simple date-picker to jump to any past date.
- Selecting a date shows every sale logged that day (same format as the today view) and that day's total.
- Ability to filter/search history (e.g., by product name, or by staff member who logged the sale) — kept simple, not a full analytics tool.

### 6.4 Edit & Delete Sales
- Every sale entry (today or in history) can be tapped to open its details, where it can be edited (item, price, quantity) or deleted.
- Editing or deleting a sale automatically adjusts stock levels accordingly (e.g., deleting a sale returns that quantity to stock).
- Edited entries can optionally show a small "edited" indicator for transparency — kept simple, not a full audit log in v1.

### 6.5 Products & Basic Inventory
- A "Products" screen listing everything in the catalog: name, category (e.g. "Weave-ons" / "Cosmetics" / "Other" — she can define her own categories), price, and current stock quantity.
- Add a new product (name, category, default price, starting stock quantity).
- Edit a product's details (price, category, name).
- Restock: a simple "+ add stock" action that increases the quantity on hand (for when she buys more inventory), separate from sales, so stock isn't only ever going down.
- Stock automatically decreases when a sale is logged against that product, and increases when a sale referencing it is deleted or reduced.
- Low-stock indicator: products under a configurable threshold (default: 5 units) are visually flagged on the Products screen, so she notices before she runs out. (A push/email alert is a nice-to-have — see Phase 2. v1 is just a visual flag on the page.)
- A custom/one-off sale item (Section 6.1) does not require a product to exist and does not affect stock.

### 6.6 Accounts & Roles
- Simple login (email + password, or a lightweight PIN-based login if that's faster for shop use — to be decided during design/build).
- Two roles:
  - **Owner** — full access: sale entry, history, products/inventory management, adding/removing staff accounts.
  - **Staff** — sale entry and today/history views only; cannot edit the product catalog or manage other accounts.
- Every sale records who logged it, visible in history.
- The owner can add a new staff account (simple name + login credential) from a Settings screen.

### 6.7 Currency & Formatting
- All amounts are in Nigerian Naira (₦), formatted with thousands separators (e.g., ₦4,500 not 4500).

---

## 7. Information Architecture (Screens)

*Note: this is a functional skeleton, not the visual design — once you share the visuals, I'll map these to the actual screens/components you have in mind and update this section.*

1. **Login** — email/PIN + password.
2. **Home / Dashboard** — today's total, today's sale count, today's sale list, prominent "Add Sale" button.
3. **Add Sale** (likely a modal/bottom-sheet rather than a full page, to keep entry fast) — product search/select or custom item, price, quantity, save.
4. **Sale Detail / Edit** — view, edit, or delete a single sale.
5. **History** — date picker + that day's sales list and total.
6. **Products** — list of products with stock and price; add/edit product; restock action. (Owner only.)
7. **Settings** — manage staff accounts, low-stock threshold, profile/logout. (Owner only, mostly.)

---

## 8. Data Model (high level)

**User**
- id, name, email or PIN identifier, password (hashed), role (owner/staff), created_at

**Product**
- id, name, category, default_price, stock_quantity, low_stock_threshold, created_at, updated_at

**Sale**
- id, product_id (nullable — null if custom/one-off item), custom_item_name (used when product_id is null), unit_price, quantity, total_price (computed), sold_by (user_id), sold_at (timestamp), edited_at (nullable), created_at

**StockAdjustment** *(for restocks, keeps a light trail without a full audit system)*
- id, product_id, quantity_added, adjusted_by (user_id), adjusted_at

---

## 9. Non-Functional Requirements

- **Mobile-first.** Primary usage is a phone (or tablet) at the counter. Must be fast and thumb-friendly; no feature should require a large screen.
- **Performance.** Logging a sale should feel instant — under a couple of seconds from opening "Add Sale" to seeing it confirmed.
- **Connectivity.** This is a live web app requiring an internet connection (data is stored centrally so it's not lost if a phone is lost/broken, and so multiple staff logins sync). Given that mobile data/power can be unreliable in a retail setting, this is a real tradeoff worth being aware of — an offline mode that syncs later is a reasonable Phase 2 addition if this becomes a problem in practice, but is deliberately excluded from v1 to keep the build simple.
- **Data safety.** This is financial record-keeping for a real business — data should be backed up/durable (a hosted database, not local-only storage), and access should require login so a lost/stolen phone doesn't expose the shop's sales data.
- **Simplicity of use.** No jargon, no multi-step onboarding, minimal settings. It should be usable by someone non-technical with under 5 minutes of explanation.

---

## 10. Suggested Tech Stack

Since this will be built with Claude Code from a public GitHub repo, here's a stack that's simple to build, cheap/free to run, and well-supported by AI coding tools:

- **Frontend:** React with Next.js, styled with Tailwind CSS. Mobile-first responsive layout.
- **Backend/Database:** Supabase (Postgres database + built-in authentication + auto-generated APIs). This avoids hand-rolling a backend server, handles login/roles easily, and has a generous free tier.
- **Hosting:** Vercel (pairs naturally with Next.js, free tier, deploys straight from the GitHub repo on every push).

This is a recommendation, not a requirement — if you or Claude Code end up preferring a different stack (e.g. Firebase instead of Supabase) the product requirements above don't change, only the implementation.

---

## 11. MVP Scope Summary

**In scope for v1 (build this first):**
- Login with owner/staff roles
- Add Sale (catalog item or custom item)
- Today's total + today's sale list
- Edit/delete a sale
- Sales history by date
- Products screen with stock tracking, restock, low-stock visual flag
- Staff account management (owner only)

**Phase 2 (explicitly deferred, revisit after v1 is in real use):**
- Weekly/monthly summary views and simple trend charts
- Low-stock push/email notifications
- Exporting sales history to CSV/PDF (e.g. for tax purposes or record-keeping outside the app)
- Offline mode with later sync
- Expense tracking (to move beyond sales-only toward basic profit tracking)
- Customer records (repeat customers, phone numbers, purchase history per customer)
- Multi-shop/branch support

---

## 12. Success Criteria

- Mom actually stops using the paper notebook and uses this daily.
- Logging a sale takes her less time than writing it down did.
- She can answer "how much did I make today/on [date]?" instantly, without any mental math.
- She notices low stock before running out, at least some of the time (better than the notebook, which gave her zero visibility into this).

---

## 13. Open Questions / Assumptions

- **Visuals pending:** You mentioned you'll share the design visuals separately — once received, Section 7 (Information Architecture) will be updated to reflect the actual screens/layout, and any additional UI-driven requirements will be folded in here.
- **Login method:** Assumed email+password is fine to start; if a PIN pad (faster for shop use, no typing) is preferred, that's a small change to Section 6.6.
- **Low-stock threshold:** Assumed a default of 5 units, editable — confirm if that's a reasonable default for weave-ons/cosmetics quantities.
- **Number of staff accounts:** Assumed small (1-3 people) — doesn't change the design, just worth confirming there's no need for anything like shift scheduling or complex permissions.

---

## 14. Suggested Build Plan (for Claude Code)

Once the repo is created, a sensible build order that keeps every step shippable and testable:

1. Project scaffold (Next.js + Tailwind + Supabase client setup) + database schema from Section 8.
2. Auth: login screen, owner/staff roles, protected routes.
3. Products screen: list, add, edit, restock, low-stock flag.
4. Add Sale flow (the core feature) + Home/Dashboard with today's total and today's list.
5. Sale edit/delete, with stock adjustment side-effects.
6. History screen with date picker.
7. Settings: staff account management.
8. Polish pass: mobile responsiveness, loading/empty states, currency formatting, error handling.

Each of these can be its own milestone/set of GitHub issues so progress is easy to track.
