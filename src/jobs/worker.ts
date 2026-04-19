import cron from "node-cron";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spendwise.vercel.app";
const SECRET  = process.env.WORKER_SECRET;

if (!SECRET) { console.error("WORKER_SECRET is required"); process.exit(1); }

async function call(path: string) {
  const t = Date.now();
  try {
    const res = await fetch(`${APP_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": SECRET! },
    });
    const body = await res.json() as unknown;
    console.log(`[${new Date().toISOString()}] ${path} → ${res.status} (${Date.now() - t}ms)`, body);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ${path} failed:`, err);
  }
}

// Daily at 06:00 UTC — process due recurring transactions
cron.schedule("0 6 * * *", () => void call("/api/recurring/process"), { timezone: "UTC" });

console.log("SpendWise worker running. Schedules:");
console.log("  Recurring transactions: daily 06:00 UTC");

// Run once on startup to catch any missed runs
void call("/api/recurring/process");
