"use client";

import { useDashboard } from "@/lib/hooks/useFinance";
import { SpendingChart, CategoryDonut } from "@/components/charts/SpendingChart";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

export default function AnalyticsPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return <p className="text-red-500">Failed to load analytics.</p>;

  const { last6Months, categoryBreakdown, currentMonth } = data;

  const netData = last6Months.map(d => ({
    month: format(parseISO(d.month + "-01"), "MMM"),
    Net: Math.round(d.net),
    fill: d.net >= 0 ? "#34C759" : "#FF3B30",
  }));

  const avgIncome   = last6Months.reduce((s, m) => s + m.total_income,   0) / last6Months.length;
  const avgExpenses = last6Months.reduce((s, m) => s + m.total_expenses, 0) / last6Months.length;
  const avgSavings  = last6Months.reduce((s, m) => s + m.savings_rate,   0) / last6Months.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">6-month overview</p>
      </div>

      {/* Averages */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Monthly Income",   value: formatCurrency(avgIncome),   icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
          { label: "Avg Monthly Expenses", value: formatCurrency(avgExpenses), icon: <TrendingDown className="h-5 w-5 text-red-500" /> },
          { label: "Avg Savings Rate",     value: `${(avgSavings * 100).toFixed(1)}%`, icon: <TrendingUp className="h-5 w-5 text-blue-500" /> },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {s.icon}{s.label}
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SpendingChart data={last6Months} /></div>
        <div><CategoryDonut data={categoryBreakdown} /></div>
      </div>

      {/* Net savings bar chart */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Monthly Net Savings</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={netData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v as number}`} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), "Net"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Bar dataKey="Net" radius={[4, 4, 0, 0]}>
              {netData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top spending categories table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Top Spending — This Month</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">% of Expenses</th>
              <th className="px-5 py-3 text-right">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categoryBreakdown.map(c => (
              <tr key={c.category_id ?? "none"} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.category_color }} />
                    {c.category_name}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold">{formatCurrency(c.total_amount)}</td>
                <td className="px-5 py-3 text-right text-gray-500">{(c.percentage * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-right text-gray-500">{c.transaction_count}</td>
              </tr>
            ))}
            {categoryBreakdown.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No expense data this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
