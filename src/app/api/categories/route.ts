import { withAuth } from "@/lib/utils/api";
import { categorySchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types";

export const GET = (req: Request) =>
  withAuth<Category[]>(async (userId) => {
    const { data, error } = await createClient()
      .from("categories").select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("sort_order").order("name");
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Category[], error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Category>(async (userId) => {
    const input = categorySchema.parse(await req.json());
    const { data, error } = await createClient()
      .from("categories").insert({ ...input, user_id: userId, is_system: false })
      .select("*").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Category, error: null };
  })(req);
