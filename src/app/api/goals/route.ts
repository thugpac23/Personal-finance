import { withAuth } from "@/lib/utils/api";
import { goalSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/types";

export const GET = (req: Request) =>
  withAuth<Goal[]>(async (userId) => {
    const { data, error } = await createClient()
      .from("goals").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Goal[], error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Goal>(async (userId) => {
    const input = goalSchema.parse(await req.json());
    const { data, error } = await createClient()
      .from("goals").insert({ ...input, user_id: userId })
      .select("*").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Goal, error: null };
  })(req);
