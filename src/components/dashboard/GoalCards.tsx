import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { Goal } from "@/types";

export function GoalCards({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Goals</h3>
        <Link href="/goals" className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {goals.slice(0, 3).map(g => {
          const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
          return (
            <div key={g.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-gray-700">{g.icon} {g.name}</span>
                <span className="text-gray-400">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="mt-0.5 flex justify-between text-xs text-gray-400">
                <span>{formatCurrency(g.current_amount)}</span>
                <span>{formatCurrency(g.target_amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
