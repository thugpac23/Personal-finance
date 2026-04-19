import { withAuth } from "@/lib/utils/api";
import { transactionSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types";

type Ctx = { params: { id: string } };

export const GET = (_req: Request, { params }: Ctx) =>
  withAuth<Transaction>(async (userId) => {
    const { data, error } = await createClient()
      .from("transactions").select("*, category:categories(*)")
      .eq("id", params.id).eq("user_id", userId).single();
    if (error) return { data: null, error: { message: "Not found" } };
    return { data: data as Transaction, error: null };
  })(_req);

export const PATCH = (req: Request, { params }: Ctx) =>
  withAuth<Transaction>(async (userId) => {
    const input = transactionSchema.partial().parse(await req.json());
    const { data, error } = await createClient()
      .from("transactions").update(input)
      .eq("id", params.id).eq("user_id", userId)
      .select("*, category:categories(*)").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Transaction, error: null };
  })(req);

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const { error } = await createClient()
      .from("transactions").delete()
      .eq("id", params.id).eq("user_id", userId);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { id: params.id }, error: null };
  })(req);
