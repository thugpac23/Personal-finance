"use client";

import { useDashboard } from "@/lib/hooks/useFinance";
import { StatCard } from "@/components/dashboard/StatCard";
import { BudgetList } from "@/components/dashboard/BudgetList";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { GoalCards } from "@/components/dashboard/GoalCards";
import { SpendingChart, CategoryDonut } from "@/components/charts/SpendingChart";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (error || !data) {
    return <p className="text-red-500">Failed to load dashboard. Please refresh.</p>;
  }

  const { currentMonth, previousMonth, last6Months, categoryBreakdown, budgetUtilization, recentTransactions, goals } = data;

  const incomeDelta  = previousMonth.total_income   > 0 ? (currentMonth.total_income   - previousMonth.total_income)   / previousMonth.total_income   : 0;
  const expenseDelta = previousMonth.total_expenses > 0 ? (currentMonth.total_expenses - previousMonth.total_expenses) / previousMonth.total_expenses : 0;

  const TrendBadge = ({ delta, invert = false }: { delta: number; invert?: boolean }) => {
    const good = invert ? delta <= 0 : delta >= 0;
    return (
      <span className={`flex items-center gap-1 font-medium ${good ? "text-green-600" : "text-red-500"}`}>
        {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}% vs last month
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Monthly Income"   value={formatCurrency(currentMonth.total_income)}   accent="green"  sub={<TrendBadge delta={incomeDelta} />} />
        <StatCard title="Monthly Expenses" value={formatCurrency(currentMonth.total_expenses)} accent="red"    sub={<TrendBadge delta={expenseDelta} invert />} />
        <StatCard title="Net Savings"      value={formatCurrency(currentMonth.net)}             accent={currentMonth.net >= 0 ? "blue" : "red"} sub={`${(currentMonth.savings_rate * 100).toFixed(0)}% savings rate`} />
        <StatCard title="Budgets On Track" value={`${budgetUtilization.filter(b => b.status === "on_track").length} / ${budgetUtilization.length}`} accent="purple" sub={`${budgetUtilization.filter(b => b.status === "over_budget").length} over budget`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SpendingChart data={last6Months} /></div>
        <div><CategoryDonut data={categoryBreakdown} /></div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><RecentTransactions transactions={recentTransactions} /></div>
        <div className="space-y-4">
          <BudgetList budgets={budgetUtilization} />
          <GoalCards goals={goals} />
        </div>
      </div>
    </div>
  );
}
