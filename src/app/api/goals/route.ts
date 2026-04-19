export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import { goalSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { Goal } from "@/types";

export const GET = (req: Request) =>
  withAuth<Goal[]>(async (userId) => {
    const rows = await sql`
      SELECT * FROM goals WHERE user_id = ${userId} ORDER BY created_at DESC
    ` as Goal[];
    return { data: rows, error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Goal>(async (userId) => {
    const input = goalSchema.parse(await req.json());
    const [row] = await sql`
      INSERT INTO goals (user_id, name, target_amount, target_date, icon, notes)
      VALUES (${userId}, ${input.name}, ${input.target_amount},
              ${input.target_date ?? null}, ${input.icon ?? "🎯"},
              ${input.notes ?? null})
      RETURNING *
    ` as Goal[];
    return { data: row as Goal, error: null };
  })(req);
