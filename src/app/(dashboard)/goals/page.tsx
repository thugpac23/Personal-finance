"use client";
export const runtime = 'edge';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoals, useCreateGoal, useUpdateGoal } from "@/lib/hooks/useFinance";
import { goalSchema, type GoalInput } from "@/lib/validations";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, X, Loader2, Target } from "lucide-react";
import { format } from "date-fns";

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [showForm, setShowForm] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<GoalInput>({ resolver: zodResolver(goalSchema), defaultValues: { icon: "🎯", currency: "EUR" } });

  const onSubmit = async (data: GoalInput) => {
    await createGoal.mutateAsync(data);
    reset(); setShowForm(false);
  };

  const handleDeposit = async (id: string, current: number) => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) return;
    await updateGoal.mutateAsync({ id, current_amount: current + amt });
    setDepositId(null); setDepositAmt("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500">Track your savings targets</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">New Goal</h2>
            <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Goal Name</label>
              <input {...register("name")} className="input" placeholder="e.g. Emergency Fund" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Icon</label>
              <input {...register("icon")} className="input" placeholder="🎯" maxLength={2} />
            </div>
            <div>
              <label className="label">Target Amount (€)</label>
              <input type="number" step="0.01" min="0" {...register("target_amount", { valueAsNumber: true })} className="input" />
              {errors.target_amount && <p className="mt-1 text-xs text-red-500">{errors.target_amount.message}</p>}
            </div>
            <div>
              <label className="label">Target Date (optional)</label>
              <input type="date" {...register("target_date")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Notes (optional)</label>
              <textarea {...register("notes")} rows={2} className="input resize-none" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                {isSubmitting ? "Saving…" : "Create Goal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (goals ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <Target className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-medium text-gray-700">No goals yet</p>
          <p className="text-sm text-gray-400">Set a savings goal and track your progress</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(goals ?? []).map(g => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const done = pct >= 100;
            return (
              <div key={g.id} className="card p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-2xl">{g.icon}</p>
                    <p className="mt-1 font-semibold text-gray-900">{g.name}</p>
                    {g.target_date && (
                      <p className="text-xs text-gray-400">By {format(new Date(g.target_date), "MMM d, yyyy")}</p>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                    done ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600")}>
                    {done ? "✓ Done" : `${pct.toFixed(0)}%`}
                  </span>
                </div>

                <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-full rounded-full transition-all", done ? "bg-green-500" : "bg-blue-500")}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-900">{formatCurrency(g.current_amount)}</span>
                  <span className="text-gray-400">of {formatCurrency(g.target_amount)}</span>
                </div>

                {g.notes && <p className="mt-2 text-xs text-gray-400">{g.notes}</p>}

                {/* Deposit */}
                {depositId === g.id ? (
                  <div className="mt-3 flex gap-2">
                    <input type="number" step="0.01" min="0" value={depositAmt}
                      onChange={e => setDepositAmt(e.target.value)}
                      className="input flex-1 text-sm" placeholder="Amount (€)" autoFocus />
                    <button onClick={() => void handleDeposit(g.id, g.current_amount)}
                      className="btn-primary px-3 text-xs">Add</button>
                    <button onClick={() => setDepositId(null)} className="btn-secondary px-2 text-xs">✕</button>
                  </div>
                ) : (
                  !done && (
                    <button onClick={() => setDepositId(g.id)}
                      className="mt-3 w-full rounded-xl border border-blue-200 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                      + Add funds
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
