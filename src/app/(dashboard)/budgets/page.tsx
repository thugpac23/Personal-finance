"use client";
export const runtime = 'edge';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBudgets, useCreateBudget, useDeleteBudget, useCategories } from "@/lib/hooks/useFinance";
import { budgetSchema, type BudgetInput } from "@/lib/validations";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<BudgetInput>({
      resolver: zodResolver(budgetSchema),
      defaultValues: { period: "monthly", start_date: format(new Date(), "yyyy-MM-01"), currency: "EUR" },
    });

  const onSubmit = async (data: BudgetInput) => {
    await createBudget.mutateAsync(data);
    reset(); setShowForm(false);
  };

  const expenseCategories = categories?.filter(c => c.type === "expense") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500">Set monthly spending limits per category</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Budget
        </button>
      </div>

      {/* New budget form */}
      {showForm && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">New Budget</h2>
            <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Budget Name</label>
              <input {...register("name")} className="input" placeholder="e.g. Groceries budget" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register("category_id")} className="input">
                <option value="">— All expenses —</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (€)</label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} className="input" placeholder="500.00" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Period</label>
              <select {...register("period")} className="input">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" {...register("start_date")} className="input" />
            </div>
            <div className="flex items-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                {isSubmitting ? "Saving…" : "Create Budget"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (budgets ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">🐷</p>
          <p className="mt-3 font-medium text-gray-700">No budgets yet</p>
          <p className="text-sm text-gray-400">Create a budget to track your spending limits</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(budgets ?? []).map(b => {
            const cat = categories?.find(c => c.id === b.category_id);
            return (
              <div key={b.id} className="card p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat?.icon ?? "💰"}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{b.period} · {cat?.name ?? "All categories"}</p>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm("Delete budget?")) deleteBudget.mutate(b.id); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(b.amount)}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Started {format(new Date(b.start_date), "MMM d, yyyy")}
                  {b.end_date && ` · ends ${format(new Date(b.end_date), "MMM d, yyyy")}`}
                </p>
                <div className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {b.is_active ? "Active" : "Inactive"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
