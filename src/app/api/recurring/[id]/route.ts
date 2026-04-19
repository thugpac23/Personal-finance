import { withAuth } from "@/lib/utils/api";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const { error } = await createClient()
      .from("recurring_transactions").delete()
      .eq("id", params.id).eq("user_id", userId);
    if (error) return { data: null, error: { message: error.message } };
    return { data: { id: params.id }, error: null };
  })(req);
