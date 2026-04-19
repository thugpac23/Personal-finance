export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import { categorySchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { Category } from "@/types";

export const GET = (req: Request) =>
  withAuth<Category[]>(async (userId) => {
    const rows = await sql`
      SELECT * FROM categories
      WHERE user_id IS NULL OR user_id = ${userId}
      ORDER BY sort_order ASC, name ASC
    ` as Category[];
    return { data: rows, error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Category>(async (userId) => {
    const input = categorySchema.parse(await req.json());
    const [row] = await sql`
      INSERT INTO categories (user_id, name, type, icon, color, is_system)
      VALUES (${userId}, ${input.name}, ${input.type}, ${input.icon ?? "📦"}, ${input.color ?? "#6B7280"}, false)
      RETURNING *
    ` as Category[];
    return { data: row as Category, error: null };
  })(req);
