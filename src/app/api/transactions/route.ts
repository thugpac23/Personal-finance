import { withAuth } from "@/lib/utils/api";
import { transactionSchema, transactionFiltersSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { PaginatedResponse, Transaction } from "@/types";

export const GET = async (req: Request) =>
  withAuth<PaginatedResponse<Transaction>>(async (userId) => {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const filters = transactionFiltersSchema.parse(params);
    const supabase = createClient();
    const from = (filters.page - 1) * filters.pageSize;

    let q = supabase
      .from("transactions")
      .select("*, category:categories(*)", { count: "exact" })
      .eq("user_id", userId)
      .range(from, from + filters.pageSize - 1);

    if (filters.type)        q = q.eq("type", filters.type);
    if (filters.category_id) q = q.eq("category_id", filters.category_id);
    if (filters.date_from)   q = q.gte("date", filters.date_from);
    if (filters.date_to)     q = q.lte("date", filters.date_to);
    if (filters.search)      q = q.ilike("description", `%${filters.search}%`);

    const [col, dir] = filters.sort.split("_") as [string, "asc" | "desc"];
    q = q.order(col === "date" ? "date" : "amount", { ascending: dir === "asc" });

    const { data, count, error } = await q;
    if (error) return { data: null, error: { message: error.message } };

    return { data: { data: data as Transaction[], count: count ?? 0, page: filters.page, pageSize: filters.pageSize, hasMore: (count ?? 0) > filters.page * filters.pageSize }, error: null };
  })(req);

export const POST = async (req: Request) =>
  withAuth<Transaction>(async (userId) => {
    const input = transactionSchema.parse(await req.json());
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions").insert({ ...input, user_id: userId })
      .select("*, category:categories(*)").single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Transaction, error: null };
  })(req);
