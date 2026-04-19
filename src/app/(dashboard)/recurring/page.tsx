"use client";
export const runtime = 'edge';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRecurring, useCreateRecurring, useDeleteRecurring, useCategories } from "@/lib/hooks/useFinance";
import { recurringSchema, type RecurringInput } from "@/lib/validations";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function RecurringPage() {
  const { data: recurring, isLoading } = useRecurring();
  const { data: categories } = useCategories();
  const createRecurring = useCreateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<RecurringInput>({
      resolver: zodResolver(recurringSchema),
      defaultValues: { type: "expense", interval: "monthly", start_date: format(new Date(), "yyyy-MM-dd"), currency: "EUR" },
    });

  const type = watch("type");
  const filteredCats = categories?.filter(c => c.type === type) ?? [];

  const onSubmit = async (data: RecurringInput) => {
    await createRecurring.mutateAsync(data);
    reset(); setShowForm(false);
  };

  const INTERVAL_LABELS: Record<string, string> = {
    daily: "Daily", weekly: "Weekly", biweekly: "Bi-weekly",
    monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring</h1>
          <p className="text-sm text-gray-500">Auto-generated transactions — processed daily at 06:00 UTC</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">New Recurring Rule</h2>
            <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="col-span-2">
              <div className="flex rounded-xl border border-gray-200 p-1 w-48">
                {(["expense", "income"] as const).map(t => (
                  <label key={t} className="flex-1 cursor-pointer">
                    <input type="radio" value={t} {...register("type")} className="sr-only" />
                    <div className={cn("rounded-lg py-1.5 text-center text-sm font-medium capitalize transition-all",
                      type === t ? (t === "income" ? "bg-green-500 text-white" : "bg-red-500 text-white") : "text-gray-500")}>
                      {t}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input {...register("description")} className="input" placeholder="e.g. Netflix, Rent…" />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register("category_id")} className="input">
                <option value="">— No category —</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (€)</label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} className="input" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Interval</label>
              <select {...register("interval")} className="input">
                {Object.entries(INTERVAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" {...register("start_date")} className="input" />
            </div>
            <div>
              <label className="label">End Date (optional)</label>
              <input type="date" {...register("end_date")} className="input" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                {isSubmitting ? "Saving…" : "Create Rule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (recurring ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <RefreshCw className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-medium text-gray-700">No recurring rules</p>
          <p className="text-sm text-gray-400">Add rules for subscriptions, rent, salary — they auto-generate transactions</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-left">Interval</th>
                <th className="px-5 py-3 text-left">Next Due</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recurring ?? []).map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span>{r.category?.icon ?? "🔄"}</span>
                      <div>
                        <p className="font-medium text-gray-800">{r.description}</p>
                        <p className="text-xs text-gray-400">{r.category?.name ?? "No category"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{INTERVAL_LABELS[r.interval]}</td>
                  <td className="px-5 py-3 text-gray-600">{format(new Date(r.next_due_date), "MMM d, yyyy")}</td>
                  <td className={cn("px-5 py-3 text-right font-semibold", r.type === "income" ? "text-green-600" : "text-gray-900")}>
                    {r.type === "income" ? "+" : "−"}{formatCurrency(r.amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                      r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {r.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => { if (confirm("Delete this recurring rule?")) deleteRecurring.mutate(r.id); }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
