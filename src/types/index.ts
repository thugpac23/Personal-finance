export type TransactionType      = "income" | "expense";
export type RecurrenceInterval   = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type BudgetPeriod         = "weekly" | "monthly" | "quarterly" | "yearly";
export type GoalStatus           = "active" | "completed" | "paused" | "cancelled";

export interface Profile {
  id: string; email: string; full_name: string | null; avatar_url: string | null;
  currency: string; locale: string; timezone: string; created_at: string; updated_at: string;
}

export interface Category {
  id: string; user_id: string | null; name: string; icon: string; color: string;
  type: TransactionType; is_system: boolean; sort_order: number; created_at: string;
}

export interface Transaction {
  id: string; user_id: string; category_id: string | null; recurring_id: string | null;
  type: TransactionType; amount: number; currency: string; description: string;
  notes: string | null; date: string; is_recurring_child: boolean;
  created_at: string; updated_at: string; category?: Category;
}

export interface RecurringTransaction {
  id: string; user_id: string; category_id: string | null; type: TransactionType;
  amount: number; currency: string; description: string; interval: RecurrenceInterval;
  start_date: string; end_date: string | null; next_due_date: string;
  last_run_at: string | null; is_active: boolean; created_at: string; updated_at: string;
  category?: Category;
}

export interface Budget {
  id: string; user_id: string; category_id: string | null; name: string;
  amount: number; currency: string; period: BudgetPeriod; start_date: string;
  end_date: string | null; is_active: boolean; created_at: string; updated_at: string;
  category?: Category;
}

export interface Goal {
  id: string; user_id: string; name: string; target_amount: number; current_amount: number;
  currency: string; target_date: string | null; status: GoalStatus; icon: string;
  notes: string | null; created_at: string; updated_at: string;
}

export interface MonthlySummary {
  month: string; total_income: number; total_expenses: number; net: number; savings_rate: number;
}

export interface CategoryBreakdown {
  category_id: string | null; category_name: string; category_color: string;
  total_amount: number; transaction_count: number; percentage: number;
}

export interface BudgetUtilization {
  budget_id: string; budget_name: string; category_id: string | null; category_name: string;
  budget_amount: number; spent_amount: number; utilization: number;
  status: "on_track" | "warning" | "over_budget";
}

export interface DashboardData {
  currentMonth: MonthlySummary; previousMonth: MonthlySummary; last6Months: MonthlySummary[];
  categoryBreakdown: CategoryBreakdown[]; budgetUtilization: BudgetUtilization[];
  recentTransactions: Transaction[]; upcomingRecurring: RecurringTransaction[]; goals: Goal[];
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } };

export interface PaginatedResponse<T> {
  data: T[]; count: number; page: number; pageSize: number; hasMore: boolean;
}

export interface TransactionFilters {
  type?: TransactionType; category_id?: string; date_from?: string; date_to?: string;
  search?: string; page?: number; pageSize?: number;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

export interface CreateTransactionInput {
  category_id?: string; type: TransactionType; amount: number; currency?: string;
  description: string; notes?: string; date: string;
}

export interface CreateRecurringInput {
  category_id?: string; type: TransactionType; amount: number; currency?: string;
  description: string; interval: RecurrenceInterval; start_date: string; end_date?: string;
}

export interface CreateBudgetInput {
  category_id?: string; name: string; amount: number; currency?: string;
  period: BudgetPeriod; start_date: string; end_date?: string;
}

export interface CreateGoalInput {
  name: string; target_amount: number; currency?: string;
  target_date?: string; icon?: string; notes?: string;
}
