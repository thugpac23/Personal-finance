export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import { transactionSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { Transaction } from "@/types";

type Ctx = { params: { id: string } };

const withCategory = async (id: string): Promise<Transaction | null> => {
  const [row] = await sql`
    SELECT t.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ${id}
  ` as Transaction[];
  return row ?? null;
};

export const GET = (_req: Request, { params }: Ctx) =>
  withAuth<Transaction>(async (userId) => {
    const [row] = await sql`SELECT id FROM transactions WHERE id = ${params.id} AND user_id = ${userId}`;
    if (!row) return { data: null, error: { message: "Not found" } };
    return { data: (await withCategory(params.id))!, error: null };
  })(_req);

export const PATCH = (req: Request, { params }: Ctx) =>
  withAuth<Transaction>(async (userId) => {
    const input = transactionSchema.partial().parse(await req.json());
    const fields = Object.entries(input).filter(([, v]) => v !== undefined);
    if (!fields.length) return { data: null, error: { message: "No fields to update" } };

    const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(", ");
    const vals = fields.map(([, v]) => v);

    const rows = await sql(`UPDATE transactions SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING id`, [params.id, userId, ...vals]);
    if (!rows.length) return { data: null, error: { message: "Not found" } };
    return { data: (await withCategory(params.id))!, error: null };
  })(req);

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const rows = await sql`DELETE FROM transactions WHERE id = ${params.id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return { data: null, error: { message: "Not found" } };
    return { data: { id: params.id }, error: null };
  })(req);
