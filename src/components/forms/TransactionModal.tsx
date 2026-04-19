"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { useCreateTransaction, useUpdateTransaction, useCategories } from "@/lib/hooks/useFinance";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/types";

interface Props { open: boolean; transaction?: Transaction; onClose: () => void; }

export function TransactionModal({ open, transaction, onClose }: Props) {
  const { data: categories } = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<TransactionInput>({
      resolver: zodResolver(transactionSchema),
      defaultValues: { type: "expense", date: format(new Date(), "yyyy-MM-dd"), currency: "EUR" },
    });

  const type = watch("type");

  useEffect(() => {
    if (transaction) {
      reset({ type: transaction.type, category_id: transaction.category_id ?? undefined,
        amount: transaction.amount, currency: transaction.currency,
        description: transaction.description, notes: transaction.notes ?? undefined, date: transaction.date });
    } else {
      reset({ type: "expense", date: format(new Date(), "yyyy-MM-dd"), currency: "EUR" });
    }
  }, [transaction, reset]);

  const filteredCats = categories?.filter(c => c.type === type) ?? [];

  const onSubmit = async (data: TransactionInput) => {
    if (transaction) { await update.mutateAsync({ id: transaction.id, ...data }); }
    else { await create.mutateAsync(data); }
    onClose(); reset();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{transaction ? "Edit Transaction" : "Add Transaction"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1">
            {(["expense", "income"] as const).map(t => (
              <label key={t} className="flex-1 cursor-pointer">
                <input type="radio" value={t} {...register("type")} className="sr-only" />
                <div className={`rounded-lg py-2 text-center text-sm font-medium capitalize transition-all
                  ${type === t ? (t === "income" ? "bg-green-500 text-white" : "bg-red-500 text-white") : "text-gray-500"}`}>
                  {t}
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="label">Description</label>
            <input {...register("description")} className="input" placeholder="e.g. Supermarket, Salary…" />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (€)</label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })}
                className="input" placeholder="0.00" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" {...register("date")} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select {...register("category_id")} className="input">
              <option value="">— No category —</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea {...register("notes")} rows={2} className="input resize-none" placeholder="Any extra details…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? "Saving…" : transaction ? "Save Changes" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
