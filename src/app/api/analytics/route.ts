import { withAuth } from "@/lib/utils/api";
import { createClient } from "@/lib/supabase/server";
import { subMonths, startOfMonth, format } from "date-fns";
import type { DashboardData, MonthlySummary, CategoryBreakdown, BudgetUtilization } from "@/types";

export const GET = (req: Request) =>
  withAuth<DashboardData>(async (userId) => {
    const supabase = createClient();
    const now = new Date();
    const sixAgo = format(subMonths(startOfMonth(now), 5), "yyyy-MM-dd");

    const { data: txns, error } = await supabase
      .from("transactions").select("*, category:categories(*)")
      .eq("user_id", userId).gte("date", sixAgo).order("date", { ascending: false });
    if (error) return { data: null, error: { message: error.message } };

    // Build monthly buckets
    const map = new Map<string, { income: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) map.set(format(subMonths(startOfMonth(now), i), "yyyy-MM"), { income: 0, expenses: 0 });
    for (const t of txns ?? []) {
      const key = (t.date as string).slice(0, 7);
      const e = map.get(key); if (!e) continue;
      if (t.type === "income") e.income += Number(t.amount); else e.expenses += Number(t.amount);
    }

    const last6Months: MonthlySummary[] = Array.from(map.entries()).map(([month, d]) => ({
      month, total_income: d.income, total_expenses: d.expenses,
      net: d.income - d.expenses,
      savings_rate: d.income > 0 ? (d.income - d.expenses) / d.income : 0,
    }));

    const thisMonth = format(startOfMonth(now), "yyyy-MM");
    const expThisMonth = (txns ?? []).filter(t => (t.date as string).startsWith(thisMonth) && t.type === "expense");
    const totalExp = expThisMonth.reduce((s, t) => s + Number(t.amount), 0);

    const catMap = new Map<string, CategoryBreakdown>();
    for (const t of expThisMonth) {
      const k = t.category_id ?? "none";
      const ex = catMap.get(k);
      if (ex) { ex.total_amount += Number(t.amount); ex.transaction_count++; }
      else catMap.set(k, { category_id: t.category_id as string | null, category_name: (t.category as { name: string } | null)?.name ?? "Uncategorized", category_color: (t.category as { color: string } | null)?.color ?? "#8E8E93", total_amount: Number(t.amount), transaction_count: 1, percentage: 0 });
    }
    const categoryBreakdown = Array.from(catMap.values())
      .map(c => ({ ...c, percentage: totalExp > 0 ? c.total_amount / totalExp : 0 }))
      .sort((a, b) => b.total_amount - a.total_amount);

    const { data: budgetRaw } = await supabase.rpc("get_budget_utilization", { p_user_id: userId });
    const budgetUtilization: BudgetUtilization[] = (budgetRaw ?? []).map((b: Record<string, unknown>) => ({
      budget_id: b["budget_id"] as string, budget_name: b["budget_name"] as string,
      category_id: b["category_id"] as string | null, category_name: b["category_name"] as string,
      budget_amount: Number(b["budget_amount"]), spent_amount: Number(b["spent_amount"]),
      utilization: Number(b["utilization"]),
      status: Number(b["utilization"]) >= 1 ? "over_budget" : Number(b["utilization"]) >= 0.8 ? "warning" : "on_track",
    }));

    const nextWeek = format(new Date(now.getTime() + 7 * 86_400_000), "yyyy-MM-dd");
    const { data: upcoming } = await supabase.from("recurring_transactions")
      .select("*, category:categories(*)").eq("user_id", userId).eq("is_active", true)
      .lte("next_due_date", nextWeek).order("next_due_date");

    const { data: goals } = await supabase.from("goals").select("*")
      .eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false });

    return {
      data: {
        currentMonth: last6Months.at(-1)!,
        previousMonth: last6Months.at(-2) ?? last6Months.at(-1)!,
        last6Months, categoryBreakdown, budgetUtilization,
        recentTransactions: ((txns ?? []).slice(0, 10)) as never,
        upcomingRecurring: (upcoming ?? []) as never,
        goals: (goals ?? []) as never,
      },
      error: null,
    };
  })(req);
