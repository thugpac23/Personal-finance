import { withAuth } from "@/lib/utils/api";
import { recurringSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { RecurringTransaction } from "@/types";

export const GET = (req: Request) =>
  withAuth<RecurringTransaction[]>(async (userId) => {
    const { data, error } = await createClient()
      .from("recurring_transactions").select("*, category:categories(*)")
      .eq("user_id", userId).order("next_due_date");
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as RecurringTransaction[], error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<RecurringTransaction>(async (userId) => {
    const input = recurringSchema.parse(await req.json());
    const { data, error } = await createClient()
      .from("recurring_transactions")
      .insert({ ...input, user_id: userId, next_due_date: input.start_date })
      .select("*, category:categories(*)").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as RecurringTransaction, error: null };
  })(req);
