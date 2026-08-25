import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "@/components/settings/staff-manager";
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
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[32px] font-bold text-text-primary">Settings</h1>

      <StaffManager staff={staff ?? []} ownerId={user!.id} />

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
