import Link from "next/link";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
        <Link href="/transactions" className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>
      {transactions.length === 0
        ? <p className="p-5 text-sm text-gray-400">No transactions yet. <Link href="/transactions" className="text-blue-600 hover:underline">Add one →</Link></p>
        : (
          <ul className="divide-y divide-gray-50">
            {transactions.map(t => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{t.category?.icon ?? "💸"}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {t.category?.name ?? "Uncategorized"} · {format(new Date(t.date), "MMM d")}
                    </p>
                  </div>
                </div>
                <span className={cn("text-sm font-semibold", t.type === "income" ? "text-green-600" : "text-gray-900")}>
                  {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}
