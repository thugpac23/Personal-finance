import { cn } from "@/lib/utils";

const ACCENT = {
  green:  "text-green-600",
  red:    "text-red-500",
  blue:   "text-blue-600",
  purple: "text-purple-600",
};

interface Props {
  title: string;
  value: string;
  sub?: React.ReactNode;
  accent?: keyof typeof ACCENT;
}

export function StatCard({ title, value, sub, accent = "blue" }: Props) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <p className={cn("mt-2 text-2xl font-bold", ACCENT[accent])}>{value}</p>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
