export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import sql from "@/lib/db";
import { subMonths, startOfMonth, format } from "date-fns";
import type { DashboardData, MonthlySummary, CategoryBreakdown, BudgetUtilization } from "@/types";

export const GET = (req: Request) =>
  withAuth<DashboardData>(async (userId) => {
    const now     = new Date();
    const sixAgo  = format(subMonths(startOfMonth(now), 5), "yyyy-MM-dd");
    const nextWeek = format(new Date(now.getTime() + 7 * 86_400_000), "yyyy-MM-dd");
    const thisMonth = format(startOfMonth(now), "yyyy-MM");

    // Monthly income/expense aggregates for last 6 months
    const monthlyRaw = await sql`
      SELECT date_trunc('month', date)::date as month, type, SUM(amount::numeric) as total
      FROM transactions
      WHERE user_id = ${userId} AND date >= ${sixAgo}
      GROUP BY date_trunc('month', date), type
      ORDER BY month ASC
    ` as { month: string; type: string; total: number }[];

    const map = new Map<string, { income: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) map.set(format(subMonths(startOfMonth(now), i), "yyyy-MM"), { income: 0, expenses: 0 });
    for (const r of monthlyRaw) {
      const key = String(r.month).slice(0, 7);
      const e = map.get(key); if (!e) continue;
      if (r.type === "income") e.income = Number(r.total); else e.expenses = Number(r.total);
    }

    const last6Months: MonthlySummary[] = Array.from(map.entries()).map(([month, d]) => ({
      month, total_income: d.income, total_expenses: d.expenses,
      net: d.income - d.expenses,
      savings_rate: d.income > 0 ? (d.income - d.expenses) / d.income : 0,
    }));

    // Category breakdown for current month
    const catRaw = await sql`
      SELECT t.category_id,
             COALESCE(c.name, 'Uncategorized') as category_name,
             COALESCE(c.color, '#8E8E93')      as category_color,
             SUM(t.amount::numeric)             as total_amount,
             COUNT(*)::int                      as transaction_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
        AND t.type = 'expense'
        AND to_char(t.date, 'YYYY-MM') = ${thisMonth}
      GROUP BY t.category_id, c.name, c.color
      ORDER BY total_amount DESC
    ` as { category_id: string | null; category_name: string; category_color: string; total_amount: number; transaction_count: number }[];

    const totalExp = catRaw.reduce((s, r) => s + Number(r.total_amount), 0);
    const categoryBreakdown: CategoryBreakdown[] = catRaw.map(r => ({
      category_id: r.category_id, category_name: r.category_name, category_color: r.category_color,
      total_amount: Number(r.total_amount), transaction_count: r.transaction_count,
      percentage: totalExp > 0 ? Number(r.total_amount) / totalExp : 0,
    }));

    // Budget utilization via SQL function
    const budgetRaw = await sql`SELECT * FROM get_budget_utilization(${userId}, to_char(CURRENT_DATE, 'YYYY-MM'))` as Record<string, unknown>[];
    const budgetUtilization: BudgetUtilization[] = budgetRaw.map(b => ({
      budget_id: b["budget_id"] as string, budget_name: b["budget_name"] as string,
      category_id: b["category_id"] as string | null, category_name: b["category_name"] as string,
      budget_amount: Number(b["budget_amount"]), spent_amount: Number(b["spent_amount"]),
      utilization: Number(b["utilization"]),
      status: Number(b["utilization"]) >= 1 ? "over_budget" : Number(b["utilization"]) >= 0.8 ? "warning" : "on_track",
    }));

    // Recent transactions
    const recentTransactions = await sql`
      SELECT t.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `;

    // Upcoming recurring (next 7 days)
    const upcomingRecurring = await sql`
      SELECT rt.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
      FROM recurring_transactions rt LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.user_id = ${userId} AND rt.is_active = true AND rt.next_due_date <= ${nextWeek}
      ORDER BY rt.next_due_date ASC
    `;

    // Active goals
    const goals = await sql`
      SELECT * FROM goals WHERE user_id = ${userId} AND status = 'active' ORDER BY created_at DESC
    `;

    return {
      data: {
        currentMonth:  last6Months.at(-1)!,
        previousMonth: last6Months.at(-2) ?? last6Months.at(-1)!,
        last6Months, categoryBreakdown, budgetUtilization,
        recentTransactions: recentTransactions as never,
        upcomingRecurring:  upcomingRecurring  as never,
        goals:              goals              as never,
      },
      error: null,
    };
  })(req);
