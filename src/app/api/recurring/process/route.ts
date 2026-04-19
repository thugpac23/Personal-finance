import { NextResponse } from "next/server";
import { verifyWorkerSecret } from "@/lib/utils/api";
import { createAdminClient } from "@/lib/supabase/server";
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

  const admin = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: due, error } = await admin
    .from("recurring_transactions").select("*")
    .eq("is_active", true).lte("next_due_date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0, failed = 0;

  for (const rule of due ?? []) {
    if (rule.end_date && rule.next_due_date > rule.end_date) {
      await admin.from("recurring_transactions").update({ is_active: false }).eq("id", rule.id);
      continue;
    }

    const { error: insertErr } = await admin.from("transactions").insert({
      user_id: rule.user_id, category_id: rule.category_id, recurring_id: rule.id,
      type: rule.type, amount: rule.amount, currency: rule.currency,
      description: rule.description, date: rule.next_due_date, is_recurring_child: true,
    });

    if (insertErr) { console.error(`Rule ${rule.id as string}:`, insertErr.message); failed++; continue; }

    await admin.from("recurring_transactions").update({
      next_due_date: nextDate(rule.next_due_date as string, rule.interval as RecurringTransaction["interval"]),
      last_run_at: new Date().toISOString(),
    }).eq("id", rule.id);

    processed++;
  }

  console.log(`[worker] processed=${processed} failed=${failed}`);
  return NextResponse.json({ processed, failed });
}
