import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SaleWithRelations } from "@/types/database";

export async function getSalesForRange(
  supabase: SupabaseClient<Database>,
  startISO: string,
  endISO: string,
): Promise<SaleWithRelations[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, product:products(id,name,category), seller:profiles(id,name)",
    )
    .gte("sold_at", startISO)
    .lt("sold_at", endISO)
    .order("sold_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as SaleWithRelations[];
}

/** All sales across all dates, newest first — used by the Debts page. */
export async function getAllSales(
  supabase: SupabaseClient<Database>,
): Promise<SaleWithRelations[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, product:products(id,name,category), seller:profiles(id,name)",
    )
    .order("sold_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as SaleWithRelations[];
}
