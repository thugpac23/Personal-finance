import { withAuth } from "@/lib/utils/api";
import { recurringSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { RecurringTransaction } from "@/types";

const withCategory = async (id: string): Promise<RecurringTransaction> => {
  const [row] = await sql`
    SELECT rt.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
    FROM recurring_transactions rt LEFT JOIN categories c ON rt.category_id = c.id
    WHERE rt.id = ${id}
  ` as RecurringTransaction[];
  return row;
};

export const GET = (req: Request) =>
  withAuth<RecurringTransaction[]>(async (userId) => {
    const rows = await sql`
      SELECT rt.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
      FROM recurring_transactions rt LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.user_id = ${userId}
      ORDER BY rt.next_due_date ASC
    ` as RecurringTransaction[];
    return { data: rows, error: null };
  })(req);

export const POST = (req: Request) =>
  withAuth<RecurringTransaction>(async (userId) => {
    const input = recurringSchema.parse(await req.json());
    const [row] = await sql`
      INSERT INTO recurring_transactions
        (user_id, category_id, type, amount, currency, description, interval, start_date, end_date, next_due_date)
      VALUES
        (${userId}, ${input.category_id ?? null}, ${input.type}, ${input.amount},
         ${input.currency ?? "EUR"}, ${input.description}, ${input.interval},
         ${input.start_date}, ${input.end_date ?? null}, ${input.start_date})
      RETURNING id
    `;
    return { data: await withCategory((row as { id: string }).id), error: null };
  })(req);
