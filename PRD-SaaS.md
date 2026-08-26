# Product Requirements Document — SaleBook (Commercial / Multi-Tenant SaaS)

**Product name (working title):** SaleBook
**Author:** OBA
**Date:** August 26, 2026
**Status:** Draft v1 — commercial multi-tenant version
**Supersedes:** the original single-shop PRD (`PRD.md`), which described the private build made for one shop (T-Max Store). This document describes the version that any small shop can sign up for and pay to use.

---

## 0. How to read this document

This PRD is written to be built by **Claude Code inside VS Code**, against the existing SaleBook codebase (Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Supabase). It assumes the single-shop version already exists and works; the job is to evolve it into a multi-tenant product, not to start from zero.

Where a section describes something already partly built, it says so. Where it describes net-new work, it spells out the data model, the RLS implications, and the screens, so an engineer (human or Claude Code) can implement it without guessing.

**Guiding principle, carried over from the original:** keep it simple for the shop owner. The person using this is behind a counter with a customer waiting — not an accountant. Every feature has to survive that test. New complexity (billing, theming, multi-tenancy) lives in the plumbing and the settings screens, never in the daily sale-logging path.

---

## 1. Background & the commercial opportunity

The original SaleBook was built for one real shop: OBA's mother's store, T-Max Store, which sells hair attachments/weave-ons and cosmetics. It replaced a paper notebook with a fast web app for logging sales, seeing daily totals, tracking stock, and letting more than one person record sales.

It works. That is the whole basis for turning it into a product: it solves a real, boring, daily problem for a real user, and thousands of other small shops have the exact same problem and the exact same notebook.

The commercial version lets **any small shop** sign up on their own, brand the app as their own, and pay a small monthly fee to use it — without OBA having to set up anything by hand for each customer.

**Positioning note (important for build priorities):** although the long-term market is "any small retail business," v1 should be built and sold to shops that look like T-Max Store — small Nigerian retail, especially beauty/cosmetics/accessories. That is the customer OBA understands deeply. The product should not add features that only make sense for other retail types until the core is proven with this audience. This keeps scope tight and the app opinionated rather than generic-and-bland.

---

## 2. Goals

### Product goals
- Let a new shop **sign up and be logging sales in under 5 minutes**, with no help from OBA.
- Let each shop **make the app feel like theirs** — their name, their brand, their color/theme — from the very first screen (this is the flagship early feature; see Section 6).
- Preserve everything the single-shop version did well: fast sale entry, automatic daily totals, searchable history, stock tracking, staff accounts, mistake correction, phone-first.
- **Wall every shop's data off from every other shop's**, enforced at the database level, not just in the UI.
- **Collect recurring revenue** via a free trial that converts to a monthly subscription.

### Business goals
- Reach the first 10–20 paying shops in the target audience.
- Keep per-customer running cost low enough that a low monthly price is still profitable (achievable on Supabase + Vercel + per-transaction payment fees).
- Learn what small shops will actually pay for, using T-Max Store as the always-on test shop.

---

## 3. Non-Goals (out of scope for this version)

- No accounting, tax filing, or profit-margin/P&L reporting. (Simple sales reports are in scope; formal accounting is not.)
- No online storefront, e-commerce, or customer-facing catalog. This records in-person sales; it is not a shopping site.
- No payment-processing/POS card terminal integration for the shop's *customers*. (Paystack is used to collect the shop's *subscription* to SaleBook — that is a different thing.)
- No barcode scanning (parked for later).
- No multi-branch/multi-location support within a single shop account (each account = one shop for now).
- No offline mode (requires internet; see Section 13 risk note).
- No native mobile app — this is a responsive web app installable as a PWA.
- No custom-domain-per-shop, no white-label reselling in v1.

---

## 4. Users & roles

Three kinds of people interact with the system:

**Shop Owner** — signs their shop up, owns the subscription, manages products/stock, manages staff, sets the branding/theme, sees all reports and history, logs sales. Not technical; the app must be obvious with zero training.

**Shop Staff** — logs sales, sees today's totals; does not manage products, staff, billing, or branding, and (per the original build's simplification) can see history but not administrative screens. Created by the owner from Settings.

**Platform Admin (OBA)** — not a role inside any one shop. This is OBA's own back-office view across all shops (how many shops, who's on trial, who's paying, who churned). Can be minimal in v1 — even a read-only Supabase dashboard/SQL view is acceptable to start — but the PRD names it so it isn't forgotten.

Roles within a shop are stored as a flag on the user's profile (`owner` / `staff`), exactly as in the single-shop build; what changes is that the flag now lives inside a specific shop's scope.

---

## 5. The single most important architectural change: multi-tenancy

Everything else in this document depends on this section. It must be built first.

### 5.1 What changes
Today, the whole app is one shop's data in one database with no concept of "which shop." To serve many shops, every piece of data must belong to a shop, and every user must only ever see their own shop's data.

### 5.2 Data model change
Introduce a top-level `shops` table (the "tenant"). Every existing table that holds shop data — `profiles`, `products`, `sales`, `stock_adjustments` — gets a `shop_id` column referencing `shops.id`.

```
shops
  id             uuid primary key
  name           text            -- "T-Max Store"
  what_they_sell text            -- short free-text, e.g. "Hair & cosmetics"
  business_type  text            -- from onboarding (e.g. "Beauty & cosmetics")
  staff_count    int             -- self-reported at signup (informational)
  theme_preset   text            -- chosen theme id (see Section 6)
  accent_color   text            -- chosen accent hex (see Section 6)
  logo_url       text nullable   -- optional uploaded logo
  created_at     timestamptz
  -- billing fields — see Section 8
  subscription_status  text      -- 'trialing' | 'active' | 'past_due' | 'canceled'
  trial_ends_at        timestamptz
  paystack_customer_code text nullable
  paystack_subscription_code text nullable
  current_period_end   timestamptz nullable
```

Each user's `profiles` row now carries `shop_id` and their in-shop `role` (`owner`/`staff`).

### 5.3 Row-Level Security (the critical part)
Every table's RLS policies must be rewritten so a row is only visible/editable when its `shop_id` equals the requesting user's `shop_id`. Introduce a helper, mirroring the existing `is_owner()` pattern:

```sql
-- returns the shop_id of the currently authenticated user
create or replace function public.current_shop_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select shop_id from public.profiles where id = auth.uid()
$$;
```

Then every policy on every shop-scoped table gains a `using (shop_id = public.current_shop_id())` clause (and `with check (...)` on writes). The existing owner-only write policies on `products` remain, now *combined* with the shop scope (a user must be both an owner AND in that shop).

The stock-mutating RPC functions (`create_sale`, `update_sale`, `delete_sale`, `restock_product`) must be updated to stamp and respect `shop_id`, and to keep the `SECURITY DEFINER` fix already applied in the single-shop version.

**Acceptance test for this section:** create two shops, log sales in each, and confirm from shop A's session that no query, RPC, or URL-tampering can read or mutate shop B's products, sales, staff, or totals. This is the highest-risk area in the whole product; it deserves explicit tests.

### 5.4 Backfill
The existing T-Max Store data must be migrated into the new structure as shop #1 (create a `shops` row for it, set `shop_id` on all its existing rows). No data loss.

---

## 6. FLAGSHIP FEATURE — Onboarding & Shop Branding

This is the feature OBA wants to lead with, and it is what makes a stranger's first five minutes feel personal instead of generic. It runs immediately after signup, before the shop owner reaches the dashboard.

### 6.1 The onboarding flow (first run, owner only)
A short, friendly, multi-step wizard. One question per screen, phone-first, with a progress indicator. It should feel like being welcomed, not like filling a form. Collected fields all write to the new `shops` row (and the owner's `profiles` row).

**Step 1 — "What's your name?"**
The owner's own name (used to greet them: "Good morning, Ada"). Writes to `profiles.name`.

**Step 2 — "What's your shop called?"**
Brand/shop name. Writes `shops.name`. This name then appears in the sidebar, on receipts, on the login screen greeting — everywhere the app refers to "the shop."

**Step 3 — "What do you sell?"**
Short free text (e.g. "Hair attachments and cosmetics"). Writes `shops.what_they_sell`. Used on reports and receipts, and later for tailoring.

**Step 4 — "What kind of business is this?"**
A pick-list of business types (Beauty & cosmetics, Fashion & accessories, Supermarket/provisions, Electronics/accessories, Pharmacy, Other). Writes `shops.business_type`. Informational in v1 but valuable for OBA to see who's signing up, and a hook for later per-type defaults.

**Step 5 — "How many people work here?"**
Staff count (just them, 2–3, 4–10, more). Writes `shops.staff_count`. Informational + hints whether to nudge them toward adding staff accounts.

**Step 6 — "Make it yours" — THEME & BRANDING (the centerpiece).**
See 6.2 below. This is where they pick how their dashboard looks.

**Step 7 — "Add your first product" (optional, skippable).**
A gentle nudge to add one product so the dashboard isn't empty on first load. Skippable — they can do it later. If skipped, the empty dashboard shows a friendly "Add your first product" prompt rather than a blank screen.

At the end: a brief "You're all set, [name]! Welcome to [shop name]." and drop them onto their freshly-branded dashboard.

**Re-entry:** onboarding runs once (gated on whether `shops.name`/theme are set). Everything chosen here is later editable from **Settings → Shop Profile** and **Settings → Appearance**, so nothing is a permanent decision.

### 6.2 Theme & branding control (scope: presets + custom accent)
Each shop gets:

- **A choice of preset themes.** Ship ~6 ready-made, professionally-balanced palettes (e.g. the existing dark navy/blue "Midnight" as the default, plus options like clean light "Daylight," warm "Terracotta," deep "Forest," "Plum," "Slate"). Each preset defines the full set of surface/text/border tokens for both a light and dark treatment. Presented as tappable swatches with a live mini-preview.
- **A custom accent color on top of the chosen preset.** A color picker (plus a row of suggested swatches for the non-technical) lets them set the single accent color used for primary buttons, active nav, highlights, and totals. This is the "make it feel like my brand" lever without giving them enough rope to make the app unreadable.
- **An optional logo upload.** Stored in Supabase Storage, shown in the sidebar and on receipts. Optional — a colored circle with their initials is the fallback (as in the current build).

**Deliberately NOT in scope (and why):** full free-form control of every color, custom fonts, and CSS-level control. Small shop owners don't want it and can easily make something illegible. Presets + one accent color is the sweet spot: real personalization, guaranteed-readable result. (Full control can be a later "Pro" differentiator.)

### 6.3 How theming works technically
The app already uses Tailwind CSS v4 with semantic color tokens (`bg-surface-base`, `text-text-primary`, `bg-accent-blue`, etc.) defined as CSS variables. The theming system extends this rather than replacing it:

- Each preset is a named set of CSS-variable values (the existing `globals.css` token block, parameterized).
- On load, the app reads the shop's `theme_preset` and `accent_color` and sets the corresponding CSS variables on the document root (e.g. an inline style / data-attribute on `<html>`, applied in the root layout from the shop record so there's no flash of the wrong theme).
- The accent color overrides the preset's accent token specifically.
- Because every component already uses semantic tokens (not hardcoded hex), no component code needs per-theme changes — swap the variables and the whole app re-skins. Any remaining hardcoded colors must be converted to tokens as part of this work.

**Acceptance test:** two shops with different presets + accents, viewed in two sessions, each render fully in their own theme with no bleed, and no flash-of-default-theme on first paint.

### 6.4 Settings → Appearance (post-onboarding editing)
Owner can revisit and change preset, accent, and logo at any time, with the same live preview. Staff cannot change branding.

---

## 7. Core Features (carried over from single-shop, now multi-tenant)

These already exist in the single-shop build and must keep working per-shop. Summarized here; behavior is unchanged except that everything is now scoped to the shop.

### 7.1 Quick Sale Entry
One-tap "Add Sale" from home. Pick a catalog product (searchable) or type a one-off custom item. Price pre-fills from the product, editable. Quantity defaults to 1. Line total auto-calculates. Instant lightweight save. Catalog items decrement stock automatically (via the shop-scoped `create_sale` RPC).

### 7.2 Today's Total (Dashboard/Home)
On open: today's total sales (₦) and number of sales, front and center, now under the shop's branding. Below: today's sales in reverse-chronological order (item, price, qty, time, who logged it).

### 7.3 Sales History
Searchable/filterable by date. Any past day shows exactly what was sold, for how much, by whom. Read-only view with entry points to edit/correct.

### 7.4 Products & Stock
Owner manages the product catalog (name, default price, current stock). Stock visibly flagged when low (see 9.2 for the new alert). Restock action adds stock and leaves an audit trail in `stock_adjustments` via the `restock_product` RPC.

### 7.5 Staff Accounts
Owner adds/removes staff from Settings; owner sets a temporary password directly (no email invite, per the existing simplification — revisit once email delivery is configured). Each sale is attributed to the user who logged it. Staff are scoped to the shop.

### 7.6 Mistake Correction
Edit or delete a logged sale after the fact; stock side-effects reverse/adjust correctly and transactionally (the already-fixed `update_sale`/`delete_sale` behavior, now shop-scoped).

### 7.7 Currency formatting
Naira rendered as "₦ 4,500" with the deliberate space after the symbol (existing `currency.ts` convention). Keep it; make the currency a per-shop setting only if/when a non-Naira shop appears (not required for v1's target audience).

---

## 8. Billing — Free trial → monthly subscription (Paystack)

### 8.1 Model
- Every new shop starts on a **free trial** (recommend **14 days**, full access) — no card required to start, so nothing blocks the "signed up and using it in 5 minutes" goal.
- At/after trial end, the shop must **subscribe monthly** to keep using it. Recommend a **single simple plan** at a low naira price point (exact figure TBD by OBA; keep it small-shop-friendly). A yearly option at a discount can come later.
- Payments via **Paystack** (the standard for recurring billing in Nigeria; per-transaction fee, no monthly platform fee — right for a ₦0-to-start budget). Paystack Plans + Subscriptions handle the recurring charge.

### 8.2 What gating looks like
- `shops.subscription_status` drives access: `trialing` and `active` → full access; `past_due` → grace-period banner urging payment; `canceled`/expired trial → app becomes read-only with an "Reactivate to keep logging sales" wall (they can still *see* their data — never hold their sales data hostage — but can't log new sales until they pay).
- A persistent, non-nagging banner during trial ("6 days left in your trial") with a clear "Subscribe" button.

### 8.3 Flow
1. Owner hits "Subscribe" (from banner, or when trial expires).
2. App creates/looks up a Paystack customer for the shop, initializes a subscription to the plan, and hands off to Paystack's checkout.
3. On success, **Paystack webhook** → a Supabase Edge Function verifies the event and updates `shops.subscription_status`, `current_period_end`, and the Paystack codes. **Access is granted by the verified webhook, never by the client claiming success** (security requirement).
4. Recurring renewals and failures arrive as webhooks and update status the same way (`active` ↔ `past_due` ↔ `canceled`).

### 8.4 Prerequisite (flagged honestly)
Collecting live subscription money in Nigeria requires a **registered business (CAC)** for Paystack payout/verification. This is a real-world dependency outside the code and should be started early; it does not block building/testing (Paystack test mode works without it), only real revenue.

### 8.5 Platform admin view
OBA needs to see, across all shops: count on trial, active, past-due, canceled; trial end dates; signups over time. A minimal secured admin page (or, to start, a read-only SQL view / Supabase dashboard) is acceptable for v1.

---

## 9. New value-add features (what makes outsiders want to pay)

These go beyond the notebook-replacement core and are the reasons a shop chooses SaleBook over pen and paper or a rival. Build after multi-tenancy, onboarding, and billing are solid.

### 9.1 Reports & simple analytics (owner)
- Sales totals by day / week / month (with a simple chart).
- Best-selling products.
- Sales per staff member.
- All read-only, all shop-scoped, all phrased for a non-accountant ("You sold ₦142,000 this week, up from ₦119,000 last week").

### 9.2 Low-stock alerts
- Per-product low-stock threshold (owner sets, sensible default).
- Dashboard surfaces "Running low" items; optional summary so the owner learns what to restock before they run out. This turns the app from a record into something that saves them money.

### 9.3 Receipts
- Generate a simple receipt per sale that can be printed or, more usefully for this market, **shared via WhatsApp**.
- Branded with the shop's name/logo/theme (ties back to Section 6 — branding pays off here).

### 9.4 First-run empty states & guidance
- Every empty screen (no products, no sales yet) shows a friendly next-step prompt rather than a blank void, so a brand-new shop is never lost.

### 9.5 PWA install
- Installable to the phone home screen, full-screen, app-like. No app store needed. Cheap to add, big perceived-legitimacy win for a shop owner.

---

## 10. Screens / information architecture

- **Public:** Landing/marketing page (what it is, price, "Start free trial"), Sign-up, Log-in, password reset.
- **Onboarding wizard** (Section 6) — first run only.
- **Dashboard / Home** — today's total, today's sales, low-stock nudge, trial/billing banner.
- **Add Sale** — the fast path (modal/sheet from anywhere).
- **History** — searchable past sales.
- **Products** — catalog + stock + restock (owner).
- **Reports** — analytics (owner).
- **Settings** — Shop Profile, Appearance/branding, Staff accounts, Billing/subscription, Account/logout.
- **Platform Admin** (OBA only) — cross-shop overview.

All authenticated screens sit inside the shop's theme and behind the subscription gate (except Billing and read-only data, which stay reachable when expired).

---

## 11. Tech stack & implementation notes (for Claude Code)

- **Framework:** Next.js 16 (App Router, TypeScript) — existing.
- **Styling:** Tailwind CSS v4 with semantic CSS-variable tokens — existing; extended for theming (Section 6.3).
- **Backend/DB/Auth:** Supabase (Postgres, Auth, RLS, Storage, Edge Functions) — existing, now multi-tenant.
- **Payments:** Paystack (Plans + Subscriptions + webhooks via a Supabase Edge Function).
- **Fonts:** Roboto self-hosted via `@fontsource/roboto` — existing.
- **Hosting:** Vercel (free tier to start) + Supabase (free tier to start).
- **Migrations:** continue the numbered `supabase/migrations/*.sql` convention. Multi-tenancy is a new migration set; do not edit historical migrations — add new ones and backfill.
- **Secrets:** Supabase service-role key and Paystack secret key are server-only (Edge Functions / server actions), never shipped to the browser. `.gitignore` already covers `.env*`.
- **Security posture to preserve:** keep RLS on for every table; keep the stock RPCs `SECURITY DEFINER`; grant execute to `authenticated` only; verify all billing state server-side from Paystack webhooks.

---

## 12. Build sequence (recommended order for Claude Code)

Each phase should be independently shippable/testable before the next.

1. **Multi-tenancy foundation (Section 5).** `shops` table, `shop_id` everywhere, `current_shop_id()`, rewritten RLS, updated RPCs, backfill T-Max Store. Gate: the two-shop isolation test passes.
2. **Signup + onboarding wizard (Section 6.1) + theming engine (6.2–6.3).** A stranger can self-serve from signup to a branded dashboard. Gate: two shops render in two themes with no bleed, no flash.
3. **Billing (Section 8)** in Paystack test mode: trial countdown, subscribe flow, webhook-driven status, access gating. Gate: simulated trial-expiry and payment correctly flip access.
4. **Value-add features (Section 9)** in priority order: reports → low-stock alerts → receipts → PWA. Each shop-scoped.
5. **Platform admin view (8.5)** — even minimal.
6. **Landing/marketing page + go-live** (register CAC/Paystack live in parallel with phases 3–4 so it's ready).

Throughout: T-Max Store stays as shop #1 and the always-on real-world test tenant — prove each feature there before it reaches paying strangers.

---

## 13. Risks & honest constraints

- **Tenant isolation is the make-or-break risk.** A leak between shops is catastrophic for trust. RLS-first, explicit isolation tests, no shortcuts.
- **No offline mode.** Counters with flaky internet will feel it. Acceptable for v1; PWA + later offline-queue is the mitigation path.
- **CAC/Paystack real-money dependency** (8.4) — start early, runs outside the code.
- **"Any retail business" temptation.** Staying narrow (T-Max-like shops) early is a feature, not a limitation; resist generic bloat until the core is proven and paid for.
- **Support burden.** Self-serve onboarding and good empty states are what keep support from eating OBA alive as shop count grows — they're not polish, they're load-bearing.

---

## 14. Success criteria for this version

- A shop OBA has never met can sign up, brand their dashboard, log sales, hit the trial wall, pay via Paystack, and keep using it — with zero manual intervention.
- No shop can ever see another shop's data.
- 10–20 paying shops in the target audience, with T-Max Store still running happily on the same codebase.
