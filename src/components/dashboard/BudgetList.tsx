import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { BudgetUtilization } from "@/types";

export function BudgetList({ budgets }: { budgets: BudgetUtilization[] }) {
  if (budgets.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900">Budgets</h3>
        <p className="mt-2 text-sm text-gray-400">No budgets yet.</p>
        <Link href="/budgets" className="mt-1 block text-xs text-blue-600 hover:underline">Create one →</Link>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Budget Status</h3>
        <Link href="/budgets" className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {budgets.slice(0, 5).map(b => (
          <div key={b.budget_id}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-gray-700">{b.category_name}</span>
              <span className={cn(
                "font-semibold",
                b.status === "over_budget" ? "text-red-600" : b.status === "warning" ? "text-amber-500" : "text-gray-500"
              )}>
                {formatCurrency(b.spent_amount)} / {formatCurrency(b.budget_amount)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className={cn("h-full rounded-full transition-all",
                b.status === "over_budget" ? "bg-red-500" : b.status === "warning" ? "bg-amber-400" : "bg-green-500"
              )} style={{ width: `${Math.min(b.utilization * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
