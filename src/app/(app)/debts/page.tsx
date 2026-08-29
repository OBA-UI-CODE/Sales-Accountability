import { createClient } from "@/lib/supabase/server";
import { getAllSales } from "@/lib/data/sales";
import { isDebt } from "@/lib/payment";
import { DebtsList } from "@/components/debts/debts-list";

export default async function DebtsPage() {
  const supabase = await createClient();
  const sales = await getAllSales(supabase);
  const debts = sales.filter(isDebt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold text-text-primary">Debts</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sales with an outstanding balance, newest first.
        </p>
      </div>
      <DebtsList sales={debts} />
    </div>
  );
}
