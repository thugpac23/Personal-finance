import { z } from "zod";

export const transactionSchema = z.object({
  category_id: z.string().uuid().optional(),
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive("Amount must be positive").max(9_999_999),
  currency:    z.string().length(3).default("EUR"),
  description: z.string().min(1, "Description required").max(200),
  notes:       z.string().max(1000).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export const recurringSchema = z.object({
  category_id: z.string().uuid().optional(),
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive().max(9_999_999),
  currency:    z.string().length(3).default("EUR"),
  description: z.string().min(1).max(200),
  interval:    z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const budgetSchema = z.object({
  category_id: z.string().uuid().optional(),
  name:        z.string().min(1).max(100),
  amount:      z.number().positive().max(9_999_999),
  currency:    z.string().length(3).default("EUR"),
  period:      z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const goalSchema = z.object({
  name:          z.string().min(1).max(100),
  target_amount: z.number().positive().max(9_999_999),
  currency:      z.string().length(3).default("EUR"),
  target_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon:          z.string().max(10).default("🎯"),
  notes:         z.string().max(1000).optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  currency:  z.string().length(3).optional(),
  locale:    z.string().min(2).max(10).optional(),
  timezone:  z.string().min(2).max(50).optional(),
});

export const transactionFiltersSchema = z.object({
  type:        z.enum(["income", "expense"]).optional(),
  category_id: z.string().uuid().optional(),
  date_from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search:      z.string().max(100).optional(),
  page:        z.coerce.number().int().min(1).default(1),
  pageSize:    z.coerce.number().int().min(1).max(100).default(25),
  sort:        z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
});

export type TransactionInput      = z.infer<typeof transactionSchema>;
export type RecurringInput        = z.infer<typeof recurringSchema>;
export type BudgetInput           = z.infer<typeof budgetSchema>;
export type GoalInput             = z.infer<typeof goalSchema>;
export type ProfileUpdateInput    = z.infer<typeof profileUpdateSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
