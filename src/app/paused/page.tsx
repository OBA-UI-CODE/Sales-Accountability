import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/logout";
import { reopenShop } from "./actions";

export default async function PausedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("role, name").eq("id", user.id).single(),
    supabase.from("app_settings").select("paused_at").eq("id", true).maybeSingle(),
  ]);

  // Not actually paused (or was just reopened) — nothing to show here.
  if (!settings?.paused_at) {
    redirect("/");
  }

  const isOwner = profile?.role === "owner";

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-surface-base px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-accent-blue" />
        <h1 className="text-2xl font-bold text-text-primary">
          This shop is paused
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {isOwner
            ? "You paused SaleBook for T-Max Store. Every sale, product and debt is still exactly as you left it — reopen whenever you're ready."
            : "The owner has paused this shop for now. Check back later, or ask them to reopen it."}
        </p>

        {isOwner && (
          <form action={reopenShop} className="mt-8">
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent-blue py-3.5 text-[15px] font-semibold text-text-primary transition hover:bg-accent-blue-strong"
            >
              Reopen my shop
            </button>
          </form>
        )}

        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-2xl border border-border-subtle py-3.5 text-sm font-semibold text-text-secondary"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
