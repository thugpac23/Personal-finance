import { NextResponse } from "next/server";
import { verifyWorkerSecret } from "@/lib/utils/api";
import sql from "@/lib/db";
import { addDays, addWeeks, addMonths, addQuarters, addYears, format } from "date-fns";
import type { RecurringTransaction } from "@/types";

function nextDate(current: string, interval: RecurringTransaction["interval"]): string {
  const d = new Date(current);
  switch (interval) {
    case "daily":     return format(addDays(d, 1),    "yyyy-MM-dd");
    case "weekly":    return format(addWeeks(d, 1),   "yyyy-MM-dd");
    case "biweekly":  return format(addWeeks(d, 2),   "yyyy-MM-dd");
    case "monthly":   return format(addMonths(d, 1),  "yyyy-MM-dd");
    case "quarterly": return format(addQuarters(d, 1),"yyyy-MM-dd");
    case "yearly":    return format(addYears(d, 1),   "yyyy-MM-dd");
  }
}

export async function POST(req: Request) {
  if (!verifyWorkerSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const due = await sql`
    SELECT * FROM recurring_transactions WHERE is_active = true AND next_due_date <= ${today}
  ` as RecurringTransaction[];

  let processed = 0, failed = 0;

  for (const rule of due) {
    if (rule.end_date && rule.next_due_date > rule.end_date) {
      await sql`UPDATE recurring_transactions SET is_active = false WHERE id = ${rule.id}`;
      continue;
    }

    try {
      await sql`
        INSERT INTO transactions (user_id, category_id, recurring_id, type, amount, currency, description, date, is_recurring_child)
        VALUES (${rule.user_id}, ${rule.category_id ?? null}, ${rule.id}, ${rule.type},
                ${rule.amount}, ${rule.currency ?? "EUR"}, ${rule.description}, ${rule.next_due_date}, true)
      `;
      await sql`
        UPDATE recurring_transactions
        SET next_due_date = ${nextDate(rule.next_due_date, rule.interval)},
            last_run_at   = NOW()
        WHERE id = ${rule.id}
      `;
      processed++;
    } catch (err) {
      console.error(`Rule ${rule.id}:`, err);
      failed++;
    }
  }

  console.log(`[worker] processed=${processed} failed=${failed}`);
  return NextResponse.json({ processed, failed });
}
