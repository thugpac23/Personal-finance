export const runtime = "edge";

import { withAuth } from "@/lib/utils/api";
import { transactionSchema, transactionFiltersSchema } from "@/lib/validations";
import sql from "@/lib/db";
import type { PaginatedResponse, Transaction } from "@/types";

export const GET = async (req: Request) =>
  withAuth<PaginatedResponse<Transaction>>(async (userId) => {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const filters = transactionFiltersSchema.parse(params);

    const conds: string[] = ["t.user_id = $1"];
    const filterArgs: unknown[] = [userId];

    const addFilter = (cond: string, val: unknown) => {
      filterArgs.push(val);
      conds.push(cond.replace("?", `$${filterArgs.length}`));
    };

    if (filters.type)        addFilter("t.type = ?",                   filters.type);
    if (filters.category_id) addFilter("t.category_id = ?",            filters.category_id);
    if (filters.date_from)   addFilter("t.date >= ?",                  filters.date_from);
    if (filters.date_to)     addFilter("t.date <= ?",                  filters.date_to);
    if (filters.search)      addFilter("t.description ILIKE ?",        `%${filters.search}%`);

    const where = conds.join(" AND ");
    const [sortCol, sortDir] = filters.sort.split("_") as [string, string];
    const orderCol  = sortCol === "date" ? "t.date" : "t.amount";
    const orderDir  = sortDir === "asc"  ? "ASC"    : "DESC";
    const from      = (filters.page - 1) * filters.pageSize;

    const [{ count }] = await sql(`SELECT COUNT(*)::int as count FROM transactions t WHERE ${where}`, filterArgs) as [{ count: number }];

    const queryArgs = [...filterArgs, filters.pageSize, from];
    const n = filterArgs.length;
    const rows = await sql(
      `SELECT t.*,
         json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type,'is_system',c.is_system) as category
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE ${where}
       ORDER BY ${orderCol} ${orderDir}
       LIMIT $${n + 1} OFFSET $${n + 2}`,
      queryArgs
    ) as Transaction[];

    return {
      data: { data: rows, count, page: filters.page, pageSize: filters.pageSize, hasMore: count > filters.page * filters.pageSize },
      error: null,
    };
  })(req);

export const POST = async (req: Request) =>
  withAuth<Transaction>(async (userId) => {
    const input = transactionSchema.parse(await req.json());
    const [row] = await sql`
      INSERT INTO transactions (user_id, category_id, type, amount, currency, description, date, notes)
      VALUES (${userId}, ${input.category_id ?? null}, ${input.type}, ${input.amount},
              ${input.currency ?? "EUR"}, ${input.description}, ${input.date}, ${input.notes ?? null})
      RETURNING *
    `;
    const [txn] = await sql`
      SELECT t.*, json_build_object('id',c.id,'name',c.name,'icon',c.icon,'color',c.color,'type',c.type) as category
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ${(row as { id: string }).id}
    ` as Transaction[];
    return { data: txn as Transaction, error: null };
  })(req);
