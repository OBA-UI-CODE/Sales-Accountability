import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "@/components/settings/staff-manager";
import { ShopPausePanel } from "@/components/settings/shop-pause-panel";
import { logout } from "@/app/actions/logout";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/");
  }

  const { data: staff } = await supabase
    .from("profiles")
    .select("*")
    .is("removed_at", null)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[32px] font-bold text-text-primary">Settings</h1>

      <StaffManager staff={staff ?? []} ownerId={user!.id} />

      <div className="rounded-2xl bg-surface-card p-6">
        <h3 className="mb-2 text-sm font-bold text-text-primary">
          Your data
        </h3>
        <p className="mb-4 text-xs text-text-muted">
          A spreadsheet of every sale, debt and product — useful for your own
          records, or just to open in Excel.
        </p>
        <a
          href="/api/export"
          className="flex w-fit items-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:bg-surface-elevated"
        >
          <Download className="h-3.5 w-3.5" />
          Download my records
        </a>
      </div>

      <ShopPausePanel />

      <form action={logout} className="md:hidden">
        <button
          type="submit"
          className="w-full rounded-2xl border border-border-subtle py-3.5 text-sm font-semibold text-text-secondary"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
