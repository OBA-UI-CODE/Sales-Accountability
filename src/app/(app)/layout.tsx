import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Auth user exists but has no profile row yet — nothing sensible to
    // show. Bounce back to login rather than rendering a broken shell.
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 bg-surface-base">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col pb-20 md:pb-0">
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 md:px-12 md:py-10">
          {children}
        </main>
      </div>
      <BottomNav profile={profile} />
    </div>
  );
}
