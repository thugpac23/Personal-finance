import { withAuth } from "@/lib/utils/api";
import { goalSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { Goal } from "@/types";

type Ctx = { params: { id: string } };

export const PATCH = (req: Request, { params }: Ctx) =>
  withAuth<Goal>(async (userId) => {
    const body = await req.json() as Record<string, unknown>;
    const input = goalSchema.partial().parse(body);
    const extra: Record<string, unknown> = {};
    if (typeof body["current_amount"] === "number") extra["current_amount"] = body["current_amount"];

    const fields = Object.entries({ ...input, ...extra }).filter(([, v]) => v !== undefined);
    if (!fields.length) return { data: null, error: { message: "No fields to update" } };

    const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(", ");
    const vals = fields.map(([, v]) => v);

    const rows = await sql(`UPDATE goals SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING *`, [params.id, userId, ...vals]) as Goal[];
    if (!rows.length) return { data: null, error: { message: "Not found" } };
    return { data: rows[0], error: null };
  })(req);

export const DELETE = (req: Request, { params }: Ctx) =>
  withAuth<{ id: string }>(async (userId) => {
    const rows = await sql`DELETE FROM goals WHERE id = ${params.id} AND user_id = ${userId} RETURNING id`;
    if (!rows.length) return { data: null, error: { message: "Not found" } };
    return { data: { id: params.id }, error: null };
  })(req);
