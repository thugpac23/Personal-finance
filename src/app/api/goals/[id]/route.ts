import { withAuth } from "@/lib/utils/api";
import { goalSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/types";

type Ctx = { params: { id: string } };

export const PATCH = (req: Request, { params }: Ctx) =>
  withAuth<Goal>(async (userId) => {
    const body = await req.json() as Record<string, unknown>;
    // Allow partial updates including current_amount (not in goalSchema)
    const input = goalSchema.partial().parse(body);
    const extra = typeof body["current_amount"] === "number" ? { current_amount: body["current_amount"] } : {};
    const { data, error } = await createClient()
      .from("goals").update({ ...input, ...extra })
      .eq("id", params.id).eq("user_id", userId)
      .select("*").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Goal, error: null };
  })(req);

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const { error } = await createClient()
      .from("goals").delete().eq("id", params.id).eq("user_id", userId);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { id: params.id }, error: null };
  })(req);
