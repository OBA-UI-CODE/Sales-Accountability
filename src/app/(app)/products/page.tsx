import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
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

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  return <ProductsClient products={products ?? []} userId={user!.id} />;
}
