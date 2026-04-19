"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Transaction, RecurringTransaction, Budget, Goal, Category,
  DashboardData, PaginatedResponse, TransactionFilters,
  CreateTransactionInput, CreateRecurringInput, CreateBudgetInput, CreateGoalInput,
} from "@/types";

export const queryKeys = {
  dashboard:    () => ["dashboard"] as const,
  transactions: (f?: TransactionFilters) => ["transactions", f] as const,
  transaction:  (id: string) => ["transactions", id] as const,
  recurring:    () => ["recurring"] as const,
  budgets:      () => ["budgets"] as const,
  categories:   () => ["categories"] as const,
  goals:        () => ["goals"] as const,
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json() as { data: T; error: { message: string } | null };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

// ── Dashboard ────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => apiFetch<DashboardData>("/api/analytics"),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Transactions ─────────────────────────────────────────────
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters) Object.entries(filters).forEach(([k, v]) => v !== undefined && p.set(k, String(v)));
      return apiFetch<PaginatedResponse<Transaction>>(`/api/transactions?${p}`);
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      apiFetch<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      toast.success("Transaction added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateTransactionInput> & { id: string }) =>
      apiFetch<Transaction>(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      toast.success("Transaction updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      toast.success("Transaction deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Recurring ────────────────────────────────────────────────
export function useRecurring() {
  return useQuery({
    queryKey: queryKeys.recurring(),
    queryFn: () => apiFetch<RecurringTransaction[]>("/api/recurring"),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringInput) =>
      apiFetch<RecurringTransaction>("/api/recurring", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.recurring() });
      toast.success("Recurring transaction created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.recurring() });
      toast.success("Recurring rule deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Budgets ──────────────────────────────────────────────────
export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets(),
    queryFn: () => apiFetch<Budget[]>("/api/budgets"),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      apiFetch<Budget>("/api/budgets", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      toast.success("Budget created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      toast.success("Budget deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Categories ───────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => apiFetch<Category[]>("/api/categories"),
    staleTime: Infinity,
  });
}

// ── Goals ─────────────────────────────────────────────────────
export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals(),
    queryFn: () => apiFetch<Goal[]>("/api/goals"),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) =>
      apiFetch<Goal>("/api/goals", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals() });
      toast.success("Goal created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateGoalInput> & { id: string; current_amount?: number }) =>
      apiFetch<Goal>(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals() });
      toast.success("Goal updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
