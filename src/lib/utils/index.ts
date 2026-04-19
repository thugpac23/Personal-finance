import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EUR", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string, fmt = "MMM d, yyyy"): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: fmt.includes("yyyy") ? "numeric" : undefined,
    month: "short",
    day: "numeric",
  });
}

/** Convert any frequency amount to monthly equivalent */
export function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "Monthly":   return amount;
    case "Annual":    return amount / 12;
    case "Weekly":    return (amount * 52.142857) / 12;
    case "Quarterly": return amount / 3;
    case "Bi-weekly": return (amount * 26.071429) / 12;
    default:          return amount;
  }
}

export function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}
