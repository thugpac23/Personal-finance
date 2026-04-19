export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import sql from "@/lib/db";

type Ctx = { params: { id: string } };

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const rows = await sql`DELETE FROM budgets WHERE id = ${params.id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return { data: null, error: { message: "Not found" } };
    return { data: { id: params.id }, error: null };
  })(req);
