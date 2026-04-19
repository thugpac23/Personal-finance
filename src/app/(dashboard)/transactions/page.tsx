"use client";

import { useState } from "react";
import { useTransactions, useDeleteTransaction } from "@/lib/hooks/useFinance";
import { TransactionModal } from "@/components/forms/TransactionModal";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Search, Trash2, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Transaction, TransactionFilters } from "@/types";

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ pageSize: 25, sort: "date_desc" });
  const [modal, setModal] = useState<{ open: boolean; tx?: Transaction }>({ open: false });
  const { data, isLoading } = useTransactions(filters);
  const deleteTx = useDeleteTransaction();

  const set = <K extends keyof TransactionFilters>(k: K, v: TransactionFilters[K]) =>
    setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">{data?.count ?? 0} total</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search…" className="input pl-9 w-48"
            onChange={e => set("search", e.target.value || undefined)} />
        </div>
        {(["all", "income", "expense"] as const).map(t => (
          <button key={t} onClick={() => set("type", t === "all" ? undefined : t)}
            className={cn("rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
              (filters.type ?? "all") === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}>
            {t}
          </button>
        ))}
        <select className="input w-auto" onChange={e => set("sort", e.target.value as TransactionFilters["sort"])}>
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.data ?? []).map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span>{tx.category?.icon ?? "💸"}</span>
                        <div>
                          <p className="font-medium text-gray-800">{tx.description}</p>
                          {tx.is_recurring_child && <span className="text-xs text-gray-400">🔄 Recurring</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: `${tx.category?.color ?? "#8E8E93"}20`, color: tx.category?.color ?? "#8E8E93" }}>
                        {tx.category?.name ?? "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{format(new Date(tx.date), "MMM d, yyyy")}</td>
                    <td className={cn("px-5 py-3 text-right font-semibold", tx.type === "income" ? "text-green-600" : "text-gray-900")}>
                      {tx.type === "income" ? "+" : "−"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal({ open: true, tx })}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this transaction?")) deleteTx.mutate(tx.id); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No transactions found.</td></tr>
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {data && data.count > (filters.pageSize ?? 25) && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
                <span>Showing {(((filters.page ?? 1) - 1) * (filters.pageSize ?? 25)) + 1}–{Math.min((filters.page ?? 1) * (filters.pageSize ?? 25), data.count)} of {data.count}</span>
                <div className="flex gap-2">
                  <button disabled={(filters.page ?? 1) <= 1} onClick={() => set("page", (filters.page ?? 1) - 1)}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40">Previous</button>
                  <button disabled={!data.hasMore} onClick={() => set("page", (filters.page ?? 1) + 1)}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionModal open={modal.open} transaction={modal.tx} onClose={() => setModal({ open: false })} />
    </div>
  );
}
