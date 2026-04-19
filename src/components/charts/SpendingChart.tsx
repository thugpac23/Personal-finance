"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { MonthlySummary, CategoryBreakdown } from "@/types";

export function SpendingChart({ data }: { data: MonthlySummary[] }) {
  const chart = data.map(d => ({
    month: format(parseISO(d.month + "-01"), "MMM"),
    Income: Math.round(d.total_income),
    Expenses: Math.round(d.total_expenses),
  }));

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Income vs Expenses — Last 6 Months</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34C759" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v as number}`} />
          <Tooltip
            formatter={(v: number, name: string) => [formatCurrency(v), name]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="Income"   stroke="#34C759" strokeWidth={2} fill="url(#gIncome)" />
          <Area type="monotone" dataKey="Expenses" stroke="#FF3B30" strokeWidth={2} fill="url(#gExpenses)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategoryBreakdown[] }) {
  const top = data.slice(0, 7);
  const RADIAN = Math.PI / 180;

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Spending by Category</h3>
      <p className="mb-3 text-xs text-gray-400">This month</p>
      {top.length === 0
        ? <p className="text-sm text-gray-400">No expenses this month.</p>
        : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={top} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                paddingAngle={2} dataKey="total_amount" nameKey="category_name" labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  if ((percent as number) < 0.05) return null;
                  const r = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
                  const x = (cx as number) + r * Math.cos(-(midAngle as number) * RADIAN);
                  const y = (cy as number) + r * Math.sin(-(midAngle as number) * RADIAN);
                  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>{`${((percent as number) * 100).toFixed(0)}%`}</text>;
                }}>
                {top.map((e, i) => <Cell key={i} fill={e.category_color} />)}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 11 }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </div>
  );
}
