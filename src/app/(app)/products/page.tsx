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

  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ProductsClient
      products={products ?? []}
      variants={variants ?? []}
      userId={user!.id}
    />
  );
}
