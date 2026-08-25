# SaleBook

A simple sales-logging web app for a small shop selling weave-ons and
cosmetics — built to replace a paper notebook. See [`PRD.md`](./PRD.md) for
the full product requirements.

Log a sale in a few taps, see today's total instantly, look back at any
past date, and keep a lightweight eye on stock — without any manual
arithmetic.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — frontend + server logic
- **Tailwind CSS v4** — styling, using the dark navy/blue design system from
  the SaleBook Figma file
- **Supabase** — Postgres database, authentication, and row-level security
- **Roboto** (self-hosted via `@fontsource/roboto`) — the app's typeface.
  Naira amounts are rendered as `"₦ 4,500"` with a deliberate space after
  the ₦ symbol — several fonts render the symbol's crossbar so it visually
  bleeds into the following digit without it. Keep that convention if you
  add new places that display a Naira amount (see `src/lib/currency.ts`).

## Project structure

```
src/
  app/
    login/              Public login screen
    (app)/               Everything behind auth, sharing the Sidebar/BottomNav shell
      page.tsx           Dashboard (today's total, today's sales)
      history/           Date-picker + sales history
      products/          Product catalog + stock (owner only)
      settings/          Staff account management (owner only)
    actions/logout.ts    Shared logout Server Action
  components/            UI components, grouped by feature (sale, products, nav, settings, history)
  lib/
    supabase/            Browser / Server Component / middleware / admin Supabase clients
    data/sales.ts         Shared query for fetching sales + relations over a date range
    currency.ts, date.ts  Naira formatting, Africa/Lagos date handling
  types/database.ts       Hand-written Supabase types (see note below)
supabase/migrations/       SQL migrations — schema, RLS policies, RPC functions
```

## Data model & business logic

The schema (`supabase/migrations/0001_init.sql`) implements the PRD's data
model: `profiles` (owner/staff role), `products`, `sales` (nullable
`product_id` for one-off custom items), `stock_adjustments` (restock
trail).

Stock side-effects (decrementing on a sale, restoring on delete, adjusting
on edit, incrementing on restock) are implemented as transactional Postgres
functions (`supabase/migrations/0002_sale_functions.sql`) — `create_sale`,
`update_sale`, `delete_sale`, `restock_product` — called via
`supabase.rpc(...)`. Doing this in the database means a sale and its stock
adjustment always succeed or fail together; there's no window where one
could apply without the other.

Row-level security is enabled on every table. Everyone authenticated can
read; only an `owner` can create/edit/delete products or manage staff
accounts (enforced both in the UI and in RLS policies via an `is_owner()`
helper). `supabase/migrations/0003_security_hardening.sql` locks down a few
follow-up items the Supabase database linter flagged (pinned function
`search_path`, narrower `EXECUTE` grants).

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.local.example` to `.env.local`
   and fill in your Supabase project's values (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

   `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (in the staff
   account Server Action, `src/app/(app)/settings/actions.ts`) to call the
   Supabase Admin API. Never expose it to the browser or commit it.

3. **Database** — the schema already lives in `supabase/migrations/`. If
   you're pointing this app at a fresh Supabase project, apply the three
   migration files in order (via the Supabase SQL editor, the Supabase
   CLI, or the Supabase MCP server's `apply_migration`).

4. **Run it**

   ```bash
   npm run dev
   ```

## Deploying

The app is a standard Next.js app — deploy it to Vercel (recommended,
matches the PRD's suggested stack) by importing this repo and setting the
three environment variables above in the project's settings.

## Notes / known simplifications (v1)

- **Timezone**: "today" and history date boundaries are computed in
  Africa/Lagos (fixed UTC+1) regardless of server timezone — see
  `src/lib/date.ts`.
- **Sale edit/delete permissions**: any signed-in user (owner or staff) can
  edit or delete any sale, not just their own. This matches the PRD's goal
  of staying simple for v1; tightening this to "staff can only edit their
  own same-day sales" is a small RLS/UI change if needed later.
- **Staff accounts**: the owner sets a temporary password directly when
  adding a staff member (Settings screen) rather than sending an email
  invite, since Supabase email delivery isn't configured. Staff can change
  their password later from Supabase's password-recovery flow if that gets
  wired up, or the owner can just re-add them with a new password.
- **`src/types/database.ts`** is hand-written to match the migrations. If
  you change the schema, regenerate it (`supabase gen types typescript` or
  the Supabase MCP `generate_typescript_types` tool) and update the
  `Product`/`Sale`/`Profile` aliases at the bottom of the file if field
  names change.
