import { withAuth } from "@/lib/utils/api";
import { budgetSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { Budget } from "@/types";

const withCategory = async (id: string): Promise<Budget> => {
  const [row] = await sql`
    SELECT b.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
    FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ${id}
  ` as Budget[];
  return row;
};

export const GET = (req: Request) =>
  withAuth<Budget[]>(async (userId) => {
    const rows = await sql`
      SELECT b.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
    ` as Budget[];
    return { data: rows, error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<Budget>(async (userId) => {
    const input = budgetSchema.parse(await req.json());
    const [row] = await sql`
      INSERT INTO budgets (user_id, category_id, amount, period)
      VALUES (${userId}, ${input.category_id}, ${input.amount}, ${input.period})
      RETURNING id
    `;
    return { data: await withCategory((row as { id: string }).id), error: null };
  })(req);
