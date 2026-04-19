import { withAuth } from "@/lib/utils/api";
import { budgetSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { Budget } from "@/types";

export const GET = (req: Request) =>
  withAuth<Budget[]>(async (userId) => {
    const { data, error } = await createClient()
      .from("budgets").select("*, category:categories(*)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Budget[], error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Budget>(async (userId) => {
    const input = budgetSchema.parse(await req.json());
    const { data, error } = await createClient()
      .from("budgets").insert({ ...input, user_id: userId })
      .select("*, category:categories(*)").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Budget, error: null };
  })(req);
